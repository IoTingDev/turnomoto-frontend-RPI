import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatFechaLarga } from "@/lib/mock-data";

export const Route = createFileRoute("/confirmacion")({
  head: () => ({ meta: [{ title: "Cita confirmada — Agenda Suzuki" }] }),
  component: Confirmacion,
});

function Confirmacion() {
  const navigate = useNavigate();
  const { currentClient, selectedMoto, selectedServicio, selectedFecha, selectedHora, generateTurno, resetFlow, lastTurno } = useAppStore();
  const [turno, setTurno] = useState<string | null>(null);
  const [count, setCount] = useState(25);

  useEffect(() => {
    if (!currentClient || !selectedServicio || !selectedFecha || !selectedHora) {
      navigate({ to: "/" });
      return;
    }
    // Generate turno once
    if (!turno) {
      setTurno(lastTurno ?? generateTurno());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (count <= 0) {
      resetFlow();
      navigate({ to: "/" });
    }
  }, [count, navigate, resetFlow]);

  if (!currentClient || !selectedServicio || !selectedFecha || !selectedHora) return null;
  const horaFmt = (() => {
    const [h, m] = selectedHora.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  })();

  return (
    <div className="bg-carbon min-h-screen flex flex-col items-center justify-start px-4 py-6 animate-slide-in">
      {/* Animated check */}
      <div className="relative w-24 h-24 mt-2">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--success)" strokeWidth="4"
            strokeDasharray="289" strokeDashoffset="289"
            style={{ animation: "draw-check 600ms ease-out forwards" }} />
          <path d="M30 52 L45 67 L72 38" fill="none" stroke="var(--success)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="80" strokeDashoffset="80"
            style={{ animation: "draw-check 400ms ease-out 500ms forwards" }} />
        </svg>
      </div>

      <h2 className="font-display text-2xl md:text-3xl text-white mt-4 opacity-0" style={{ animation: "scale-in 400ms ease-out 900ms forwards" }}>
        ¡Cita agendada con éxito!
      </h2>

      <div className="mt-4 opacity-0" style={{ animation: "scale-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 1100ms forwards" }}>
        <p className="font-display font-bold text-5xl md:text-6xl text-[var(--suzuki-red)] text-center leading-none">
          {turno ?? "T-000"}
        </p>
      </div>

      <div className="mt-6 w-full max-w-md bg-[var(--bg-secondary)] border-l-4 border-[var(--success)] rounded-lg p-5 space-y-2">
        <p className="font-body text-white">👤 {currentClient.nombre}</p>
        <p className="font-body text-white">🏍️ {selectedMoto?.modelo} — {selectedMoto?.placa}</p>
        <p className="font-body text-white">{selectedServicio.icono} {selectedServicio.nombre}</p>
        <p className="font-body text-white">📅 {formatFechaLarga(selectedFecha)}</p>
        <p className="font-body text-white">🕐 {horaFmt}</p>
      </div>

      <p className="text-[var(--text-muted)] text-sm mt-4 text-center">
        Recuerde llegar 10 minutos antes de su cita
      </p>

      <p className="text-white mt-6 text-center">
        Volviendo al inicio en <span className="font-display font-bold text-[var(--suzuki-red)]">{Math.max(0, count)}</span> segundos...
      </p>

      <button
        onClick={() => { resetFlow(); navigate({ to: "/" }); }}
        className="touch-btn mt-4 h-14 px-10 rounded-lg bg-[var(--suzuki-red)] text-white font-display text-lg"
      >
        Listo ✓
      </button>
    </div>
  );
}
