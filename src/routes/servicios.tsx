import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { iconoServicio } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { listarServicios, type ServicioResponse } from "@/lib/api-client";

export const Route = createFileRoute("/servicios")({
  head: () => ({ meta: [{ title: "Servicios — Agenda Suzuki" }] }),
  component: Servicios,
});

function Servicios() {
  const navigate = useNavigate();
  const { currentClient, selectedMoto, selectedServicio, setServicio } = useAppStore();
  const { warningRef, countdownRef } = useIdleTimeout();

  const { data: servicios, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["servicios"],
    queryFn: listarServicios,
    staleTime: 5 * 60 * 1000, // 5 min — catálogo cambia poco
  });

  if (!currentClient || !selectedMoto) {
    return (
      <div className="bg-carbon min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-body text-[var(--white)] mb-4">No hay cliente activo.</p>
          <button onClick={() => navigate({ to: "/" })} className="touch-btn h-14 px-6 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const handleSelectServicio = (s: ServicioResponse) => {
    // Map backend ServicioResponse → frontend Servicio (with icono and frontend-shaped duration field)
    setServicio({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion ?? "",
      duracion_min: s.duracion_minutos,
      activo: true,
      icono: iconoServicio(s.nombre),
    });
  };

  return (
    <div className="bg-carbon min-h-screen flex flex-col animate-slide-in">
      <div className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--text-muted)]/20 shrink-0">
        <button onClick={() => navigate({ to: "/" })} className="touch-btn min-w-[80px] h-12 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-display">← Volver</button>
        <h2 className="font-display text-lg md:text-xl text-[var(--white)]">Seleccione el servicio</h2>
        <span className="min-w-[80px]" />
      </div>

      <div className="px-6 py-4 shrink-0">
        <p className="font-display text-2xl text-[var(--white)]">Hola, <span className="font-bold">{currentClient.nombre}</span></p>
        <div className="mt-3 bg-[var(--bg-secondary)] border-l-[3px] border-[var(--suzuki-blue)] rounded-md px-4 py-3">
          <p className="font-body text-sm text-[var(--white)]/90">
            🏍️ <span className="font-semibold">{selectedMoto.modelo}</span> — {selectedMoto.placa}
            {selectedMoto.color && ` — ${selectedMoto.color}`}
            {selectedMoto.kilometraje > 0 && ` — ${selectedMoto.kilometraje.toLocaleString("es-CO")} km`}
          </p>
        </div>
      </div>

      <div className="px-6 pb-2 shrink-0 flex gap-2 flex-wrap">
        <button
          onClick={() => navigate({ to: "/perfil" })}
          className="touch-btn text-xs text-[var(--text-muted)] hover:text-[var(--white)] border border-[var(--text-muted)]/30 rounded-md px-3 py-2 transition-colors"
        >
          ✏️ Editar mis datos
        </button>
        <button
          onClick={() => navigate({ to: "/mis-citas" })}
          className="touch-btn text-xs text-[var(--text-muted)] hover:text-[var(--white)] border border-[var(--text-muted)]/30 rounded-md px-3 py-2 transition-colors"
        >
          📅 Mis citas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full border-4 border-[var(--suzuki-blue)] border-t-transparent animate-spin" />
            <p className="font-body text-sm text-[var(--text-muted)] mt-4">Cargando servicios...</p>
          </div>
        )}

        {isError && (
          <div className="p-4 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
            <p className="font-body text-sm text-[var(--white)] mb-3">
              ⚠️ No se pudo cargar el catálogo de servicios.
              {error instanceof Error && <span className="block text-xs text-[var(--text-muted)] mt-1">{error.message}</span>}
            </p>
            <button
              onClick={() => refetch()}
              className="touch-btn h-10 px-4 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] text-sm font-display"
            >
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !isError && servicios && (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {servicios.map((s) => {
              const sel = selectedServicio?.id === s.id;
              const icono = iconoServicio(s.nombre);
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectServicio(s)}
                  className={`touch-btn min-h-[120px] rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center bg-[var(--bg-tertiary)] border-2 ${sel ? "border-[var(--suzuki-red)] shadow-[0_0_20px_rgba(204,0,0,0.4)]" : "border-transparent"}`}
                >
                  <span className="text-3xl">{icono}</span>
                  <span className="font-display font-semibold text-[var(--white)] text-base leading-tight">{s.nombre}</span>
                  {sel && <span className="text-[var(--suzuki-red)] text-xl animate-scale-in">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 bg-[var(--bg-secondary)] border-t border-[var(--text-muted)]/20">
        <button
          disabled={!selectedServicio}
          onClick={() => navigate({ to: "/agenda" })}
          className="touch-btn w-full h-14 rounded-lg bg-[var(--suzuki-red)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-[var(--white)] font-display text-lg"
        >
          Continuar →
        </button>
      </div>

      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}
