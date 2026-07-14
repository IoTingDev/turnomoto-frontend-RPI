import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { listarCitasCliente, cancelarCita, enviarCalificacion, ApiError } from "@/lib/api-client";
import { formatFechaLarga } from "@/lib/mock-data";

export const Route = createFileRoute("/mis-citas")({
  head: () => ({ meta: [{ title: "Mis citas — Agenda Suzuki" }] }),
  component: MisCitas,
});

interface CitaItem {
  id: number;
  turno: string;
  fecha_hora: string;
  estado: string;
  notas: string | null;
  servicio: { id: number; nombre: string };
  moto: { id: number; placa: string; modelo: string };
  calificacion: { estrellas: number; comentario: string | null } | null;
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

const ESTADOS_ACTIVOS = ["pendiente", "confirmada", "en_proceso"];

function BloqueCalificacion({ citaId, inicial, onEnviada }: { citaId: number; inicial: { estrellas: number; comentario: string | null } | null; onEnviada: () => void }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  if (inicial) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--text-muted)]/15">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none tracking-wide" style={{ color: "#EF9F27" }}>
            {"★".repeat(inicial.estrellas)}<span style={{ color: "var(--bg-tertiary)" }}>{"★".repeat(5 - inicial.estrellas)}</span>
          </span>
          <span className="text-xs text-[var(--text-muted)]">Tu calificación</span>
        </div>
        {inicial.comentario && (
          <p className="mt-2 text-sm italic text-[var(--white)] bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">"{inicial.comentario}"</p>
        )}
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">Gracias por tu opinión</p>
      </div>
    );
  }

  const enviar = async () => {
    if (estrellas < 1) { setError("Toca una estrella para calificar"); return; }
    setEnviando(true); setError("");
    try {
      await enviarCalificacion(citaId, estrellas, comentario.trim());
      onEnviada();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar");
      setEnviando(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--text-muted)]/15">
      <p className="text-sm font-medium text-[var(--white)] mb-1.5">¿Cómo estuvo la atención?</p>
      <div className="flex gap-1 text-3xl leading-none" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            data-no-osk
            onMouseEnter={() => setHover(n)}
            onClick={() => setEstrellas(n)}
            className="touch-btn"
            style={{ color: (hover || estrellas) >= n ? "#EF9F27" : "var(--bg-tertiary)" }}
            aria-label={`${n} estrellas`}
          >★</button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Deja tus comentarios (opcional)"
        rows={2}
        className="mt-2 w-full rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm p-2 resize-none border border-[var(--text-muted)]/20"
      />
      {error && <p className="mt-1 text-xs text-[var(--suzuki-red)]">⚠ {error}</p>}
      <button
        onClick={enviar}
        disabled={enviando}
        className="touch-btn mt-2 h-11 px-5 rounded-lg bg-[var(--suzuki-blue)] text-white text-sm font-display disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar calificación"}
      </button>
    </div>
  );
}

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

  const recargar = () => {
    if (currentClient) listarCitasCliente(currentClient.id).then((f: any) => setCitas(f)).catch(() => {});
  };

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
        {!esProxima && c.estado === "completada" && (
          <BloqueCalificacion citaId={c.id} inicial={c.calificacion} onEnviada={recargar} />
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
