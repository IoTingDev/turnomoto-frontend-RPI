import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SERVICIOS } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";

export const Route = createFileRoute("/servicios")({
  head: () => ({ meta: [{ title: "Servicios — Agenda Suzuki" }] }),
  component: Servicios,
});

function Servicios() {
  const navigate = useNavigate();
  const { currentClient, selectedMoto, selectedServicio, setServicio } = useAppStore();
  const { warningRef, countdownRef } = useIdleTimeout();

  if (!currentClient || !selectedMoto) {
    return (
      <div className="bg-carbon min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-body text-white mb-4">No hay cliente activo.</p>
          <button onClick={() => navigate({ to: "/" })} className="touch-btn h-14 px-6 rounded-lg bg-[var(--suzuki-blue)] text-white font-display">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-carbon min-h-screen flex flex-col animate-slide-in">
      <div className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--text-muted)]/20 shrink-0">
        <button onClick={() => navigate({ to: "/" })} className="touch-btn min-w-[80px] h-12 px-3 rounded-lg bg-[var(--bg-tertiary)] text-white text-sm font-display">← Volver</button>
        <h2 className="font-display text-lg md:text-xl text-white">Seleccione el servicio</h2>
        <span className="min-w-[80px]" />
      </div>

      <div className="px-6 py-4 shrink-0">
        <p className="font-display text-2xl text-white">Hola, <span className="font-bold">{currentClient.nombre}</span></p>
        <div className="mt-3 bg-[var(--bg-secondary)] border-l-[3px] border-[var(--suzuki-blue)] rounded-md px-4 py-3">
          <p className="font-body text-sm text-white/90">
            🏍️ <span className="font-semibold">{selectedMoto.modelo}</span> — {selectedMoto.placa}
            {selectedMoto.color && ` — ${selectedMoto.color}`}
            {selectedMoto.kilometraje > 0 && ` — ${selectedMoto.kilometraje.toLocaleString("es-CO")} km`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {SERVICIOS.map((s) => {
            const sel = selectedServicio?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setServicio(s)}
                className={`touch-btn min-h-[120px] rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center bg-[var(--bg-tertiary)] border-2 ${sel ? "border-[var(--suzuki-red)] shadow-[0_0_20px_rgba(204,0,0,0.4)]" : "border-transparent"}`}
              >
                <span className="text-3xl">{s.icono}</span>
                <span className="font-display font-semibold text-white text-base leading-tight">{s.nombre}</span>
                {sel && <span className="text-[var(--suzuki-red)] text-xl animate-scale-in">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 p-4 bg-[var(--bg-secondary)] border-t border-[var(--text-muted)]/20">
        <button
          disabled={!selectedServicio}
          onClick={() => navigate({ to: "/agenda" })}
          className="touch-btn w-full h-14 rounded-lg bg-[var(--suzuki-red)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-white font-display text-lg"
        >
          Continuar →
        </button>
      </div>

      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}
