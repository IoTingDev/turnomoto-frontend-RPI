import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatFechaLarga } from "@/lib/mock-data";
import {
  listarCitasDelDia,
  actualizarEstadoCita,
  ApiError,
  type CitaTaller,
  type EstadoCita,
} from "@/lib/api-client";
import { useTallerSocket } from "@/lib/use-taller-socket";
import { useAdminGuard } from "@/hooks/use-admin-guard";

export const Route = createFileRoute("/mecanico")({
  head: () => ({ meta: [{ title: "Agenda de Taller" }] }),
  component: Mecanico,
});

type EstadoActivo = "pendiente" | "confirmada" | "en_proceso" | "completada";

const NEXT_ESTADO: Record<EstadoActivo, EstadoActivo | null> = {
  pendiente: "en_proceso",
  confirmada: "en_proceso",
  en_proceso: "completada",
  completada: null,
};

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pendiente: { bg: "bg-[var(--warning)]/20 border-[var(--warning)]/40", text: "text-[var(--warning)]", label: "Pendiente" },
  confirmada: { bg: "bg-[var(--info)]/15 border-[var(--info)]/40", text: "text-[var(--info)]", label: "Confirmada" },
  en_proceso: { bg: "bg-[var(--info)]/30 border-[var(--info)]/60", text: "text-[var(--info)]", label: "En proceso" },
  completada: { bg: "bg-[var(--success)]/20 border-[var(--success)]/40", text: "text-[var(--success)]", label: "Completada" },
  cancelada: { bg: "bg-[var(--bg-tertiary)] border-[var(--text-muted)]/30", text: "text-[var(--text-muted)]", label: "Cancelada" },
};

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Mecanico() {
  useAdminGuard(["mecanico", "gerencia"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = useMemo(() => todayString(), []);
  const todayLong = useMemo(() => formatFechaLarga(today), [today]);

  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: citas, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["citas-taller", today],
    queryFn: () => listarCitasDelDia(today),
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });

  // WS subscription for real-time updates
  useTallerSocket((event) => {
    // Any taller event invalidates the day's query → React Query refetch
    queryClient.invalidateQueries({ queryKey: ["citas-taller", today] });
    setLastUpdate(new Date());
    console.log("[MECANICO] refresh por evento:", event.event_type);
  });

  const counts = useMemo(() => {
    const c = { pendientes: 0, en_proceso: 0, completadas: 0 };
    if (!citas) return c;
    for (const cita of citas) {
      if (cita.estado === "pendiente" || cita.estado === "confirmada") c.pendientes++;
      else if (cita.estado === "en_proceso") c.en_proceso++;
      else if (cita.estado === "completada") c.completadas++;
    }
    return c;
  }, [citas]);

  const handleAdvance = async (cita: CitaTaller) => {
    if (cita.estado === "completada" || cita.estado === "cancelada") return;
    const next = NEXT_ESTADO[cita.estado as EstadoActivo];
    if (!next) return;

    setAdvancingId(cita.id);
    setErrorMsg("");
    try {
      await actualizarEstadoCita(cita.id, next as EstadoCita);
      // WS will trigger refetch, but invalidate manually as fallback
      queryClient.invalidateQueries({ queryKey: ["citas-taller", today] });
    } catch (err) {
      console.error("[MECANICO] error avanzando estado:", err);
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error desconocido al avanzar estado");
      }
    } finally {
      setAdvancingId(null);
    }
  };

  // Filter out cancelled from the main list — they shouldn't clutter the workshop view
  const visibleCitas = useMemo(
    () => (citas ?? []).filter((c) => c.estado !== "cancelada"),
    [citas]
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--white)]">
      <header className="px-6 py-5 border-b border-[var(--text-muted)]/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate({ to: "/" })}
            className="touch-btn h-11 px-4 rounded-lg bg-[var(--bg-tertiary)] text-sm font-display"
          >
            ← Volver al kiosko
          </button>
          <h1 className="font-display font-bold text-2xl md:text-3xl">📋 Agenda de Taller</h1>
        </div>
        <div className="flex flex-col items-end">
          <p className="font-body text-[var(--text-muted)] text-sm md:text-base">{todayLong}</p>
          {lastUpdate && (
            <p className="text-[10px] text-[var(--success)] mt-1">
              ⚡ Actualizado en vivo · {lastUpdate.toLocaleTimeString("es-CO")}
            </p>
          )}
        </div>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Kpi label="Pendientes" value={counts.pendientes} color="warning" icon="⏳" />
          <Kpi label="En atención" value={counts.en_proceso} color="info" icon="🔧" />
          <Kpi label="Completadas" value={counts.completadas} color="success" icon="✓" />
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
            <p className="font-body text-sm text-[var(--white)]">⚠️ {errorMsg}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full border-4 border-[var(--suzuki-blue)] border-t-transparent animate-spin" />
            <p className="font-body text-sm text-[var(--text-muted)] mt-4">Cargando agenda del día...</p>
          </div>
        )}

        {isError && (
          <div className="p-4 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
            <p className="font-body text-sm text-[var(--white)] mb-3">
              ⚠️ No se pudo cargar la agenda del día.
              {error instanceof Error && <span className="block text-xs text-[var(--text-muted)] mt-1">{error.message}</span>}
            </p>
            <button onClick={() => refetch()} className="touch-btn h-10 px-4 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] text-sm font-display">
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !isError && visibleCitas.length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📅</p>
            <p className="font-display text-xl text-[var(--white)]">No hay citas para hoy</p>
            <p className="font-body text-sm text-[var(--text-muted)] mt-2">
              Cuando los clientes agenden citas en el kiosko, aparecerán aquí automáticamente.
            </p>
          </div>
        )}

        {!isLoading && !isError && visibleCitas.length > 0 && (
          <div className="overflow-x-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--text-muted)]/15">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--text-muted)]/20">
                  <th className="py-3 px-4 font-display">Hora</th>
                  <th className="py-3 px-4 font-display">N° Turno</th>
                  <th className="py-3 px-4 font-display">Cliente</th>
                  <th className="py-3 px-4 font-display">Moto</th>
                  <th className="py-3 px-4 font-display">Servicio</th>
                  <th className="py-3 px-4 font-display">Estado</th>
                  <th className="py-3 px-4 font-display text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibleCitas.map((c) => {
                  const style = ESTADO_STYLES[c.estado] ?? ESTADO_STYLES.pendiente;
                  const isAdvancing = advancingId === c.id;
                  const next = NEXT_ESTADO[c.estado as EstadoActivo];
                  return (
                    <tr key={c.id} className="border-b border-[var(--text-muted)]/10 hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                      <td className="py-3 px-4 font-display">{c.hora}</td>
                      <td className="py-3 px-4 font-display text-[var(--suzuki-red)]">{c.turno}</td>
                      <td className="py-3 px-4">
                        <div>{c.cliente.nombre}</div>
                        <div className="text-xs text-[var(--text-muted)]">{c.cliente.telefono}</div>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">
                        {c.moto.modelo} · {c.moto.placa}
                      </td>
                      <td className="py-3 px-4">{c.servicio.nombre}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs border ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {next && (
                          <button
                            onClick={() => handleAdvance(c)}
                            disabled={isAdvancing}
                            className="touch-btn h-9 px-3 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] text-xs font-display disabled:opacity-50 inline-flex items-center gap-2"
                          >
                            {isAdvancing ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>...</span>
                              </>
                            ) : (
                              <span>{nextLabel(c.estado as EstadoActivo)}</span>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function nextLabel(current: EstadoActivo): string {
  if (current === "pendiente" || current === "confirmada") return "▶ Iniciar atención";
  if (current === "en_proceso") return "✓ Marcar completada";
  return "";
}

function Kpi({ label, value, color, icon }: { label: string; value: number; color: "warning" | "info" | "success"; icon: string }) {
  const colorVar = color === "warning" ? "var(--warning)" : color === "info" ? "var(--info)" : "var(--success)";
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--text-muted)]/15">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-[var(--text-muted)]">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="font-display font-bold text-5xl mt-2" style={{ color: colorVar }}>
        {value}
      </p>
    </div>
  );
}
