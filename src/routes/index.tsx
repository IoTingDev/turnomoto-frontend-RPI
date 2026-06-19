import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { CLIENTE_DEMO } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agenda de Taller Suzuki — Armenia, Quindío" },
      { name: "description", content: "Acerque su llavero NFC para agendar su turno de taller en el concesionario Suzuki." },
    ],
  }),
  component: Idle,
});

function Idle() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const startReg = useAppStore((s) => s.startFlowRegistered);
  const startNew = useAppStore((s) => s.startFlowNew);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaStr = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
  const horaStr = now.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="bg-carbon min-h-screen flex flex-col relative overflow-hidden">
      {/* Top zone */}
      <div className="flex-[0_0_20%] flex flex-col items-center justify-center pt-6">
        <h1 className="font-display font-bold text-white text-6xl md:text-7xl tracking-[0.25em]">SUZUKI</h1>
        <p className="font-body text-[var(--text-muted)] mt-2 text-sm md:text-base tracking-wide">
          Agenda de Taller — Armenia, Quindío
        </p>
      </div>

      {/* Center zone — NFC */}
      <div className="flex-[0_0_55%] flex flex-col items-center justify-center px-4">
        <div className="relative w-[140px] h-[140px] md:w-[180px] md:h-[180px] flex items-center justify-center">
          <span className="nfc-wave" />
          <span className="nfc-wave delay-1" />
          <span className="nfc-wave delay-2" />
          <div className="relative w-[100px] h-[100px] md:w-[130px] md:h-[130px] rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--suzuki-blue)] flex items-center justify-center shadow-[0_0_40px_rgba(0,51,153,0.5)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-14 h-14 md:w-20 md:h-20 text-white">
              <path d="M4 9c4-4 12-4 16 0M7 12c2-2 8-2 10 0M10 15c1-1 3-1 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="18" r="1.3" fill="currentColor" />
            </svg>
          </div>
        </div>
        <p className="animate-pulse-fade font-body text-white text-lg md:text-2xl mt-8 text-center max-w-md">
          Acerque su llavero para agendar su turno de taller
        </p>
      </div>

      {/* Bottom zone */}
      <div className="flex-[0_0_25%] flex flex-col items-center justify-end pb-6">
        <p className="font-display text-[var(--text-muted)] text-base md:text-lg tracking-wide">
          {fechaStr} — {horaStr}
        </p>
      </div>

      {/* Hidden admin gear (bottom-left) */}
      <div className="absolute bottom-3 left-3 z-10">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="touch-btn w-12 h-12 rounded-full bg-[var(--bg-secondary)]/60 opacity-30 hover:opacity-100 flex items-center justify-center text-xl"
          aria-label="Menú admin"
        >
          ⚙️
        </button>
        {menuOpen && (
          <div className="absolute bottom-14 left-0 bg-[var(--bg-secondary)] border border-[var(--text-muted)]/30 rounded-lg shadow-xl py-2 min-w-[240px] animate-slide-in">
            <Link to="/mecanico" className="touch-btn block px-4 py-3 text-sm hover:bg-[var(--bg-tertiary)]">
              📋 Agenda de Taller
            </Link>
            <Link to="/dashboard" className="touch-btn block px-4 py-3 text-sm hover:bg-[var(--bg-tertiary)]">
              📊 Dashboard Gerencia
            </Link>
          </div>
        )}
      </div>

      {/* Demo test buttons (bottom-right) */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-10">
        <button
          onClick={() => { startReg(CLIENTE_DEMO); navigate({ to: "/servicios" }); }}
          className="touch-btn text-[11px] bg-[var(--bg-secondary)]/70 text-white px-3 py-2 rounded border border-[var(--success)]/40"
        >
          🟢 Test: Cliente registrado
        </button>
        <button
          onClick={() => { startNew(); navigate({ to: "/registro" }); }}
          className="touch-btn text-[11px] bg-[var(--bg-secondary)]/70 text-white px-3 py-2 rounded border border-[var(--warning)]/40"
        >
          🟡 Test: Cliente nuevo
        </button>
      </div>
    </div>
  );
}
