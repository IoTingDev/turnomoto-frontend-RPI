import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { listarCitasCliente, cancelarCita, ApiError, type CitaResponse } from "@/lib/api-client";
import { SERVICIOS, formatFechaLarga } from "@/lib/mock-data";

export const Route = createFileRoute("/mis-citas")({
  head: () => ({ meta: [{ title: "Mis citas — Agenda Suzuki" }] }),
  component: MisCitas,
});

function formatHora(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatFechaFromIso(iso: string): string {
  // Backend returns "2026-06-23T09:00:00" (no Z, treated as local)
  const datePart = iso.split("T")[0];
  return formatFechaLarga(datePart);
}

function servicioNombre(id: number): string {
  return SERVICIOS.find((s) => s.id === id)?.nombre ?? `Servicio #${id}`;
}

function servicioIcono(id: number): string {
  return SERVICIOS.find((s) => s.id === id)?.icono ?? "🔧";
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "var(--warning)" },
  confirmada: { label: "Confirmada", color: "var(--info)" },
  en_proceso: { label: "En proceso", color: "var(--info)" },
};

function MisCitas() {
  const navigate = useNavigate();
  const currentClient = useAppStore((s) => s.currentClient);
  const { warningRef, countdownRef } = useIdleTimeout();

  const [citas, setCitas] = useState<CitaResponse[] | null>(null);
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
      .then((data) => { if (active) { setCitas(data); setLoading(false); } })
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
      console.log("[MIS-CITAS] cita cancelada:", citaId);
      // Refresh list
      const fresh = await listarCitasCliente(currentClient.id);
      setCitas(fresh);
      setConfirmingId(null);
    } catch (err) {
      console.error("[MIS-CITAS] error cancelando:", err);
      setCancelError(err instanceof ApiError ? err.message : "Error al cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-carbon min-h-screen flex flex-col animate-slide-in">
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
        <p className="font-display text-base text-[var(--white)]">
          {currentClient.nombre}
        </p>
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
            <p className="font-body text-sm text-[var(--white)]">⚠️ {loadError}</p>
          </div>
        )}

        {!loading && !loadError && citas && citas.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📅</p>
            <p className="font-display text-lg text-[var(--white)]">No tiene citas activas</p>
            <p className="font-body text-sm text-[var(--text-muted)] mt-2">
              Vuelva al menú principal para agendar una.
            </p>
            <button
              onClick={() => navigate({ to: "/servicios" })}
              className="touch-btn mt-6 h-12 px-6 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display"
            >
              Agendar nueva cita
            </button>
          </div>
        )}

        {!loading && citas && citas.length > 0 && (
          <div className="space-y-3">
            {citas.map((c) => {
              const estado = ESTADO_LABEL[c.estado] ?? { label: c.estado, color: "var(--text-muted)" };
              const canCancel = c.estado === "pendiente" || c.estado === "confirmada";
              const turno = `T-${String(c.id).padStart(3, "0")}`;
              return (
                <div key={c.id} className="rounded-lg bg-[var(--bg-secondary)] border-l-4 border-[var(--suzuki-blue)] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-display font-bold text-xl text-[var(--suzuki-red)]">{turno}</span>
                    <span
                      className="px-2 py-1 rounded-full text-xs border"
                      style={{ borderColor: estado.color, color: estado.color }}
                    >
                      {estado.label}
                    </span>
                  </div>
                  <p className="font-body text-[var(--white)] text-sm">
                    {servicioIcono(c.servicio_id)} {servicioNombre(c.servicio_id)}
                  </p>
                  <p className="font-body text-[var(--white)] text-sm mt-1">
                    📅 {formatFechaFromIso(c.fecha_hora)}
                  </p>
                  <p className="font-body text-[var(--white)] text-sm">
                    🕐 {formatHora(c.fecha_hora)}
                  </p>

                  {canCancel && (
                    <button
                      onClick={() => { setConfirmingId(c.id); setCancelError(""); }}
                      className="touch-btn mt-3 h-11 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--suzuki-red)] text-sm font-display border border-[var(--suzuki-red)]/40 w-full"
                    >
                      ✗ Cancelar cita
                    </button>
                  )}
                  {!canCancel && c.estado === "en_proceso" && (
                    <p className="mt-3 text-xs text-[var(--text-muted)] italic">
                      Esta cita ya está siendo atendida en el taller.
                    </p>
                  )}
                </div>
              );
            })}
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
                <p className="font-body text-sm text-[var(--white)]">⚠️ {cancelError}</p>
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
                className="touch-btn flex-1 h-14 rounded-lg bg-[var(--suzuki-red)] text-[var(--white)] font-display flex items-center justify-center gap-2 disabled:opacity-60"
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
