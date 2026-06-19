import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TURNOS_DEMO_MECANICO, formatFechaLarga } from "@/lib/mock-data";

export const Route = createFileRoute("/mecanico")({
  head: () => ({ meta: [{ title: "Agenda de Taller" }] }),
  component: Mecanico,
});

type Estado = "pendiente" | "en_proceso" | "completada";
const NEXT: Record<Estado, Estado | null> = { pendiente: "en_proceso", en_proceso: "completada", completada: null };

const ESTADO_STYLES: Record<Estado, { bg: string; text: string; label: string }> = {
  pendiente: { bg: "bg-[var(--warning)]/20 border-[var(--warning)]/40", text: "text-[var(--warning)]", label: "Pendiente" },
  en_proceso: { bg: "bg-[var(--info)]/20 border-[var(--info)]/40", text: "text-[var(--info)]", label: "En proceso" },
  completada: { bg: "bg-[var(--success)]/20 border-[var(--success)]/40", text: "text-[var(--success)]", label: "Completada" },
};

function Mecanico() {
  const navigate = useNavigate();
  const today = useMemo(() => {
    const d = new Date();
    return formatFechaLarga(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }, []);
  const [turnos, setTurnos] = useState(TURNOS_DEMO_MECANICO);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [showBloqueo, setShowBloqueo] = useState(false);

  const counts = useMemo(() => ({
    pendiente: turnos.filter((t) => t.estado === "pendiente").length,
    en_proceso: turnos.filter((t) => t.estado === "en_proceso").length,
    completada: turnos.filter((t) => t.estado === "completada").length,
  }), [turnos]);

  const proximoIdx = turnos.findIndex((t) => t.estado === "pendiente");

  const advance = (i: number) => {
    setTurnos((prev) => prev.map((t, idx) => {
      if (idx !== i) return t;
      const n = NEXT[t.estado];
      return n ? { ...t, estado: n } : t;
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">
      {/* Header */}
      <header className="px-6 py-5 border-b border-[var(--text-muted)]/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate({ to: "/" })} className="touch-btn h-11 px-4 rounded-lg bg-[var(--bg-tertiary)] text-sm font-display">← Volver al kiosko</button>
          <h1 className="font-display font-bold text-2xl md:text-3xl">📋 Agenda de Taller</h1>
        </div>
        <p className="font-body text-[var(--text-muted)] text-sm md:text-base">{today}</p>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Kpi label="Pendientes" value={counts.pendiente} color="warning" />
          <Kpi label="En atención" value={counts.en_proceso} color="info" />
          <Kpi label="Completados" value={counts.completada} color="success" />
        </div>

        {/* Lista de turnos */}
        <h2 className="font-display text-xl mb-3">Turnos de hoy</h2>
        <div className="space-y-3">
          {turnos.map((t, i) => {
            const st = ESTADO_STYLES[t.estado];
            const esProximo = i === proximoIdx;
            const next = NEXT[t.estado];
            return (
              <div
                key={i}
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className={`relative rounded-xl bg-[var(--bg-secondary)] p-4 cursor-pointer border border-[var(--text-muted)]/10
                  ${esProximo ? "ring-2 ring-[var(--suzuki-blue)] animate-pulse-border" : ""}`}
              >
                {esProximo && (
                  <span className="absolute -top-2 left-4 bg-[var(--suzuki-blue)] text-white text-[10px] font-display tracking-wider px-2 py-0.5 rounded">
                    SIGUIENTE
                  </span>
                )}
                <div className="grid grid-cols-[80px_90px_1fr_auto] md:grid-cols-[90px_100px_1.5fr_1.5fr_1fr_140px] gap-3 items-center">
                  <span className="font-display font-bold text-2xl">{t.hora}</span>
                  <span className="font-display font-bold text-[var(--suzuki-red)] text-lg">{t.turno}</span>
                  <div className="col-span-2 md:col-span-1">
                    <p className="font-body font-semibold truncate">{t.cliente}</p>
                  </div>
                  <p className="hidden md:block font-body text-sm text-[var(--text-muted)] truncate">{t.moto} · {t.placa}</p>
                  <p className="hidden md:block font-body text-sm truncate">{t.servicio}</p>
                  <span className={`justify-self-end px-3 py-1.5 rounded-full text-xs font-display tracking-wide border ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>
                <div className="md:hidden mt-2 text-sm text-[var(--text-muted)]">
                  {t.moto} · {t.placa} · {t.servicio}
                </div>
                {openIdx === i && next && (
                  <div className="mt-4 pt-4 border-t border-[var(--text-muted)]/20 flex gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); advance(i); }}
                      className="touch-btn h-12 px-4 rounded-lg bg-[var(--suzuki-blue)] text-white font-display text-sm"
                    >
                      Avanzar a: {ESTADO_STYLES[next].label} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* FAB Bloquear horario */}
      <button
        onClick={() => setShowBloqueo(true)}
        className="touch-btn fixed bottom-6 right-6 h-14 px-5 rounded-full bg-[var(--suzuki-red)] text-white font-display shadow-xl"
      >
        🔒 Bloquear horario
      </button>

      {showBloqueo && <BloqueoModal onClose={() => setShowBloqueo(false)} />}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: "warning" | "info" | "success" }) {
  const colorMap = {
    warning: { bg: "bg-[var(--warning)]/10 border-[var(--warning)]/30", text: "text-[var(--warning)]", icon: "🟡" },
    info: { bg: "bg-[var(--info)]/10 border-[var(--info)]/30", text: "text-[var(--info)]", icon: "🔵" },
    success: { bg: "bg-[var(--success)]/10 border-[var(--success)]/30", text: "text-[var(--success)]", icon: "🟢" },
  }[color];
  return (
    <div className={`rounded-xl p-5 border ${colorMap.bg}`}>
      <p className="font-body text-sm text-white/70">{colorMap.icon} {label}</p>
      <p className={`font-display font-bold text-4xl mt-2 ${colorMap.text}`}>{value}</p>
    </div>
  );
}

function BloqueoModal({ onClose }: { onClose: () => void }) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 max-w-md w-full">
        <h3 className="font-display text-xl text-white mb-4">Bloquear horario</h3>
        <label className="block mb-3">
          <span className="text-sm text-white/80">Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-12 mt-1 px-3 rounded-lg bg-[var(--bg-tertiary)] text-white" />
        </label>
        <label className="block mb-3">
          <span className="text-sm text-white/80">Franja horaria</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full h-12 mt-1 px-3 rounded-lg bg-[var(--bg-tertiary)] text-white" />
        </label>
        <label className="block mb-4">
          <span className="text-sm text-white/80">Motivo</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {["Almuerzo", "Capacitación", "Mantenimiento de equipos", "Otro"].map((m) => (
              <button key={m} onClick={() => setMotivo(m)} className={`touch-btn h-12 rounded-lg text-sm font-body ${motivo === m ? "bg-[var(--suzuki-red)] text-white" : "bg-[var(--bg-tertiary)]"}`}>
                {m}
              </button>
            ))}
          </div>
        </label>
        <div className="flex gap-3">
          <button onClick={onClose} className="touch-btn flex-1 h-12 rounded-lg bg-[var(--bg-tertiary)] text-white font-display">Cancelar</button>
          <button onClick={onClose} disabled={!fecha || !hora || !motivo} className="touch-btn flex-1 h-12 rounded-lg bg-[var(--suzuki-red)] disabled:opacity-50 text-white font-display">Confirmar</button>
        </div>
      </div>
    </div>
  );
}
