import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { listarCitasCliente, cancelarCita, ApiError } from "@/lib/api-client";
import { formatFechaLarga } from "@/lib/mock-data";

export const Route = createFileRoute("/mis-citas")({
  head: () => ({ meta: [{ title: "Mis citas — Agenda Suzuki" }] }),
  component: MisCitas,
});

// Estructura enriquecida que ahora devuelve el backend
interface CitaItem {
  id: number;
  turno: string;
  fecha_hora: string;
  estado: string;
  notas: string | null;
  servicio: { id: number; nombre: string };
  moto: { id: number; placa: string; modelo: string };
}

function formatHora(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatFechaFromIso(iso: string): string {
  const datePart = iso.split("T")[0];
  return formatFechaLarga(datePart);
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "var(--warning)" },
  confirmada: { label: "Confirmada", color: "var(--info)" },
  en_proceso: { label: "En proceso", color: "var(--info)" },
  completada: { label: "Completada", color: "var(--success)" },
  cancelada: { label: "Cancelada", color: "var(--text-muted)" },
  no_asistio: { label: "No asistió", color: "var(--suzuki-red)" },
};

// Estados que cuentan como "próximos/activos" (accionables)
const ESTADOS_ACTIVOS = ["pendiente", "confirmada", "en_proceso"];

function MisCitas() {
  const navigate = useNavigate();
  const currentClient = useAppStore((s) => s.currentClient);
  const { warningRef, countdownRef } = useIdleTimeout();

  const [citas, setCitas] = useState<CitaItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string>("");

  useEffect(() => {
    if (!currentClient) {
      navigate({ to: "/" });
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError("");
    listarCitasCliente(currentClient.id)
      .then((data: any) => { if (active) { setCitas(data); setLoading(false); } })
      .catch((err) => {
        if (!active) return;
        console.error("[MIS-CITAS] error cargando:", err);
        setLoadError(err instanceof ApiError ? err.message : "Error cargando citas");
        setLoading(false);
      });
    return () => { active = false; };
  }, [currentClient, navigate]);

  if (!currentClient) return null;

  const handleCancel = async (citaId: number) => {
    setCancellingId(citaId);
    setCancelError("");
    try {
      await cancelarCita(citaId);
      const fresh: any = await listarCitasCliente(currentClient.id);
      setCitas(fresh);
      setConfirmingId(null);
    } catch (err) {
      console.error("[MIS-CITAS] error cancelando:", err);
      setCancelError(err instanceof ApiError ? err.message : "Error al cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  // Separar en Próximas (activas y futuras) e Historial (todo lo demás)
  const ahora = Date.now();
  const proximas = (citas ?? []).filter(
    (c) => ESTADOS_ACTIVOS.includes(c.estado) && new Date(c.fecha_hora).getTime() >= ahora
  ).sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

  const historial = (citas ?? []).filter(
    (c) => !proximas.includes(c)
  ).sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

  const renderCard = (c: CitaItem, esProxima: boolean) => {
    const estado = ESTADO_LABEL[c.estado] ?? { label: c.estado, color: "var(--text-muted)" };
    const canCancel = esProxima && (c.estado === "pendiente" || c.estado === "confirmada");
    return (
      <div
        key={c.id}
        className="rounded-lg bg-[var(--bg-secondary)] border-l-4 p-4 shadow-sm"
        style={{ borderColor: esProxima ? "var(--suzuki-blue)" : "var(--text-muted)" }}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="font-display font-bold text-xl text-[var(--suzuki-red)]">{c.turno}</span>
          <span
            className="px-2 py-1 rounded-full text-xs border font-medium"
            style={{ borderColor: estado.color, color: estado.color }}
          >
            {estado.label}
          </span>
        </div>
        <p className="font-body text-[var(--white)] text-sm">{c.servicio.nombre}</p>
        <p className="font-body text-[var(--text-muted)] text-xs mt-0.5">
          {c.moto.modelo} · {c.moto.placa}
        </p>
        <p className="font-body text-[var(--white)] text-sm mt-1">
          {formatFechaFromIso(c.fecha_hora)}
        </p>
        <p className="font-body text-[var(--white)] text-sm">
          {formatHora(c.fecha_hora)}
        </p>

        {canCancel && (
          <button
            onClick={() => { setConfirmingId(c.id); setCancelError(""); }}
            className="touch-btn mt-3 h-11 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--suzuki-red)] text-sm font-display border border-[var(--suzuki-red)]/40 w-full"
          >
            ✕ Cancelar cita
          </button>
        )}
        {esProxima && c.estado === "en_proceso" && (
          <p className="mt-3 text-xs text-[var(--text-muted)] italic">
            Esta cita ya está siendo atendida en el taller.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <div className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--text-muted)]/20 shrink-0">
        <button
          onClick={() => navigate({ to: "/servicios" })}
          className="touch-btn min-w-[80px] h-12 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-display"
        >
          ← Volver
        </button>
        <h2 className="font-display text-lg md:text-xl text-[var(--white)]">Mis citas</h2>
        <span className="min-w-[80px]" />
      </div>

      <div className="px-6 py-4 shrink-0">
        <p className="font-display text-base text-[var(--white)]">{currentClient.nombre}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full border-4 border-[var(--suzuki-blue)] border-t-transparent animate-spin" />
            <p className="font-body text-sm text-[var(--text-muted)] mt-4">Cargando citas...</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="p-4 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
            <p className="font-body text-sm text-[var(--white)]">⚠ {loadError}</p>
          </div>
        )}

        {!loading && !loadError && citas && citas.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📅</p>
            <p className="font-display text-lg text-[var(--white)]">No tiene citas registradas</p>
            <button
              onClick={() => navigate({ to: "/servicios" })}
              className="touch-btn mt-6 h-12 px-6 rounded-lg bg-[var(--suzuki-blue)] text-white font-display"
            >
              Agendar nueva cita
            </button>
          </div>
        )}

        {!loading && citas && citas.length > 0 && (
          <div className="space-y-6">
            {/* Próximas */}
            <div>
              <h3 className="font-display text-sm uppercase tracking-wider text-[var(--suzuki-blue)] mb-3">
                Próximas citas {proximas.length > 0 && `(${proximas.length})`}
              </h3>
              {proximas.length > 0 ? (
                <div className="space-y-3">
                  {proximas.map((c) => renderCard(c, true))}
                </div>
              ) : (
                <p className="font-body text-sm text-[var(--text-muted)] italic">
                  No tiene citas próximas. Puede agendar una nueva desde el menú de servicios.
                </p>
              )}
            </div>

            {/* Historial */}
            {historial.length > 0 && (
              <div>
                <h3 className="font-display text-sm uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Historial ({historial.length})
                </h3>
                <div className="space-y-3">
                  {historial.map((c) => renderCard(c, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmingId !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--suzuki-red)]/40 max-w-md w-full">
            <p className="font-display text-xl text-[var(--white)] text-center">¿Cancelar esta cita?</p>
            <p className="font-body text-sm text-[var(--text-muted)] mt-2 text-center">
              Esta acción no se puede deshacer. El horario quedará libre para otros clientes.
            </p>

            {cancelError && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
                <p className="font-body text-sm text-[var(--white)]">⚠ {cancelError}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setConfirmingId(null); setCancelError(""); }}
                disabled={cancellingId !== null}
                className="touch-btn flex-1 h-14 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] font-display disabled:opacity-50"
              >
                No, conservar
              </button>
              <button
                onClick={() => handleCancel(confirmingId)}
                disabled={cancellingId !== null}
                className="touch-btn flex-1 h-14 rounded-lg bg-[var(--suzuki-red)] text-white font-display flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {cancellingId !== null ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Sí, cancelar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}
