import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { CLIENTE_DEMO } from "@/lib/mock-data";
import { useNfcReader } from "@/lib/use-nfc-reader";
import { AdminGate } from "@/components/AdminGate";

// Flag para mostrar botones de test sin tag físico — apagado por defecto en producción
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

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
  const startReg = useAppStore((s) => s.startFlowRegistered);
  const startNew = useAppStore((s) => s.startFlowNew);
  const { status: wsStatus } = useNfcReader();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaStr = `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
  const horaStr = now.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Contenido central único — centrado vertical y horizontalmente, compacto para 1024x600 */}
      <div className="flex flex-col items-center justify-center gap-6 max-w-2xl">

        {/* Marca */}
        <div className="flex flex-col items-center">
          <h1 className="font-display font-bold text-[var(--white)] text-5xl md:text-6xl tracking-[0.25em]">SUZUKI</h1>
          <p className="font-body text-[var(--text-muted)] mt-1 text-sm md:text-base tracking-wide">
            Agenda de Taller — Armenia, Quindío
          </p>
        </div>

        {/* NFC */}
        <div className="relative w-[150px] h-[150px] flex items-center justify-center">
          <span className="nfc-wave" />
          <span className="nfc-wave delay-1" />
          <span className="nfc-wave delay-2" />
          <div className="relative w-[110px] h-[110px] rounded-full bg-[var(--bg-secondary)] border-[3px] border-[var(--suzuki-blue)] flex items-center justify-center shadow-[0_4px_20px_rgba(0,51,153,0.18)]">
            <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16">
              {/* N estilizada — azul Suzuki */}
              <g stroke="var(--suzuki-blue)" strokeWidth="3.6" strokeLinecap="round" fill="none">
                <line x1="22" y1="20" x2="22" y2="44" />
                <line x1="22" y1="20" x2="42" y2="44" />
                <line x1="42" y1="20" x2="42" y2="44" />
              </g>
              {/* Ondas a la izquierda — azul Suzuki */}
              <g stroke="var(--suzuki-blue)" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85">
                <path d="M14 26 Q9 32 14 38" />
                <path d="M8 22 Q1 32 8 42" />
              </g>
              {/* Ondas a la derecha — azul Suzuki */}
              <g stroke="var(--suzuki-blue)" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85">
                <path d="M50 26 Q55 32 50 38" />
                <path d="M56 22 Q63 32 56 42" />
              </g>
            </svg>
          </div>
        </div>

        {/* Instrucción */}
        <p className="animate-pulse-fade font-body text-[var(--white)] text-xl md:text-2xl text-center max-w-md">
          Acerque su llavero para agendar su turno de taller
        </p>

        {/* Fecha y hora */}
        <p suppressHydrationWarning className="font-display text-[var(--text-muted)] text-base md:text-lg tracking-wide">
          {fechaStr} — {horaStr}
        </p>
      </div>

      {/* WS connection indicator (top-right, subtle) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <span
          className={`w-2 h-2 rounded-full ${
            wsStatus === "connected" ? "bg-[var(--success)]" :
            wsStatus === "connecting" ? "bg-[var(--warning)] animate-pulse" :
            "bg-[var(--suzuki-red)]"
          }`}
        />
        <span className="text-[10px] text-[var(--text-muted)] font-body">
          {wsStatus === "connected" ? "NFC listo" :
           wsStatus === "connecting" ? "Conectando..." :
           "Sin lector"}
        </span>
      </div>

      {/* Acceso admin oculto — long-press de 5s en esquina superior izquierda, sin indicador visual */}
      <AdminGate />

      {/* Demo test buttons — solo visibles si VITE_DEMO_MODE=true (red de seguridad para demo) */}
      {DEMO_MODE && (
        <div className="absolute bottom-12 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={() => { startReg(CLIENTE_DEMO); navigate({ to: "/servicios" }); }}
            className="touch-btn text-[11px] bg-[var(--bg-secondary)] text-[var(--white)] px-3 py-2 rounded border border-[var(--success)]/40"
          >
            🟢 Test: Cliente registrado
          </button>
          <button
            onClick={() => { startNew(); navigate({ to: "/registro" }); }}
            className="touch-btn text-[11px] bg-[var(--bg-secondary)] text-[var(--white)] px-3 py-2 rounded border border-[var(--warning)]/40"
          >
            🟡 Test: Cliente nuevo
          </button>
        </div>
      )}

      {/* Crédito del desarrollador — esquina inferior derecha, minimalista */}
      <div className="absolute bottom-2 right-3 z-10 text-right pointer-events-none select-none">
        <p className="font-display text-[10px] md:text-xs text-[var(--text-muted)]/70 tracking-wider leading-tight">
          Desarrollado por <span className="font-bold text-[var(--text-muted)]">IoTing Dev</span>
        </p>
        <p className="font-body text-[9px] md:text-[10px] text-[var(--text-muted)]/60 tracking-wide leading-tight">
          Sistemas de automatización · 2026
        </p>
      </div>
    </div>
  );
}
