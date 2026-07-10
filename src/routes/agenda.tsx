import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProximosDias, horariosDelDia } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { horariosOcupados } from "@/lib/api-client";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agendar — Agenda Suzuki" }] }),
  component: Agenda,
});

function Agenda() {
  const navigate = useNavigate();
  const { selectedServicio, selectedMoto, setFechaHora, selectedFecha, selectedHora } = useAppStore();
  const { warningRef, countdownRef } = useIdleTimeout();

  const dias = useMemo(() => getProximosDias(14), []);
  const habiles = useMemo(() => dias.filter((d) => !d.festivo).map((d) => d.fecha), [dias]);
  const [fecha, setFecha] = useState<string | null>(selectedFecha ?? habiles[0] ?? null);
  const [hora, setHora] = useState<string | null>(selectedHora);
  const [now, setNow] = useState(() => new Date());

  // Refresh "now" cada minuto para que los slots pasen a "Pasado" en vivo
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const horariosHoy = useMemo(
    () => (fecha ? horariosDelDia(fecha) : { manana: [], tarde: [] }),
    [fecha]
  );

  // Slots ocupados desde backend (Fase 4)
  const { data: ocupadosData, isLoading: ocupadosLoading } = useQuery({
    queryKey: ["citas-ocupados", fecha],
    queryFn: () => horariosOcupados(fecha!),
    enabled: !!fecha,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  const ocupados = useMemo(
    () => new Set(ocupadosData?.ocupados ?? []),
    [ocupadosData]
  );

  if (!selectedServicio || !selectedMoto) {
    return (
      <div className="bg-carbon min-h-screen flex items-center justify-center">
        <button
          onClick={() => navigate({ to: "/" })}
          className="touch-btn h-14 px-6 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const slotIsPast = (h: string): boolean => {
    if (!fecha) return false;
    return isPastSlot(fecha, h, now);
  };

  const confirm = () => {
    if (!fecha || !hora) return;
    if (ocupados.has(hora) || slotIsPast(hora)) {
      setHora(null);
      return;
    }
    setFechaHora(fecha, hora);
    navigate({ to: "/confirmacion" });
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
        <h2 className="font-display text-lg md:text-xl text-[var(--white)]">Seleccione fecha y hora</h2>
        <span className="min-w-[80px]" />
      </div>

      <div className="px-4 py-2 shrink-0">
        <div className="inline-flex items-center gap-2 bg-[var(--bg-secondary)] rounded-full px-3 py-1.5 text-sm font-body">
          <span>{selectedServicio.icono}</span>
          <span className="text-[var(--white)]">{selectedServicio.nombre}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--white)]">{selectedMoto.modelo}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--white)]">{selectedMoto.placa}</span>
        </div>
      </div>

      {/* Day picker */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {dias.map((d) => {
            const sel = fecha === d.fecha;
            const disabled = d.festivo;
            return (
              <button
                key={d.fecha}
                disabled={disabled}
                onClick={() => { setFecha(d.fecha); setHora(null); }}
                className={`touch-btn shrink-0 w-[72px] h-[78px] rounded-xl flex flex-col items-center justify-center text-center
                  ${disabled ? "bg-[var(--bg-secondary)]/40 text-[var(--text-muted)]" : sel ? "bg-[var(--suzuki-blue)] text-[var(--white)]" : "bg-[var(--bg-tertiary)] text-[var(--white)]"}`}
              >
                <span className="font-body text-xs uppercase tracking-wider opacity-80">{d.dia}</span>
                <span className="font-display font-bold text-2xl leading-none">{d.num}</span>
                {d.isToday && !sel && <span className="w-1.5 h-1.5 rounded-full bg-[var(--suzuki-blue)] mt-1" />}
                {disabled && <span className="text-[9px] mt-0.5">Festivo</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {ocupadosLoading && (
          <div className="flex items-center gap-3 mb-3 text-[var(--text-muted)]">
            <span className="w-4 h-4 border-2 border-[var(--suzuki-blue)] border-t-transparent rounded-full animate-spin" />
            <span className="font-body text-xs">Verificando disponibilidad...</span>
          </div>
        )}

        {horariosHoy.manana.length > 0 && (
          <>
            <h3 className="font-display text-[var(--text-muted)] text-sm tracking-wider mb-2">— Mañana —</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {horariosHoy.manana.map((h) => (
                <SlotBtn
                  key={h}
                  h={h}
                  ocupado={ocupados.has(h)}
                  pasado={slotIsPast(h)}
                  sel={hora === h}
                  onClick={() => setHora(h)}
                />
              ))}
            </div>
          </>
        )}

        {horariosHoy.tarde.length > 0 && (
          <>
            <h3 className="font-display text-[var(--text-muted)] text-sm tracking-wider mb-2">— Tarde —</h3>
            <div className="grid grid-cols-3 gap-2">
              {horariosHoy.tarde.map((h) => (
                <SlotBtn
                  key={h}
                  h={h}
                  ocupado={ocupados.has(h)}
                  pasado={slotIsPast(h)}
                  sel={hora === h}
                  onClick={() => setHora(h)}
                />
              ))}
            </div>
          </>
        )}

        {horariosHoy.manana.length === 0 && horariosHoy.tarde.length === 0 && (
          <div className="text-center py-8">
            <p className="font-body text-sm text-[var(--text-muted)]">
              El taller no atiende en esta fecha.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 bg-[var(--bg-secondary)] border-t border-[var(--text-muted)]/20">
        <button
          disabled={!fecha || !hora || ocupados.has(hora ?? "") || slotIsPast(hora ?? "")}
          onClick={confirm}
          className="touch-btn w-full h-14 rounded-lg bg-[var(--suzuki-red)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-white font-display text-lg"
        >
          Confirmar cita ✓
        </button>
      </div>

      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}

function SlotBtn({ h, ocupado, pasado, sel, onClick }: { h: string; ocupado: boolean; pasado: boolean; sel: boolean; onClick: () => void }) {
  if (pasado) {
    return (
      <div className="min-h-[64px] rounded-lg bg-[var(--bg-primary)]/40 border border-[var(--text-muted)]/10 flex flex-col items-center justify-center opacity-50">
        <span className="font-display text-lg text-[var(--text-muted)] line-through">{h}</span>
        <span className="text-[10px] text-[var(--text-muted)]">Pasado</span>
      </div>
    );
  }
  if (ocupado) {
    return (
      <div className="min-h-[64px] rounded-lg bg-[var(--bg-primary)] border border-[var(--text-muted)]/20 flex flex-col items-center justify-center">
        <span className="font-display text-lg text-[var(--disabled)]/50 line-through">{h}</span>
        <span className="text-[10px] text-[var(--text-muted)]">Ocupado</span>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`touch-btn min-h-[64px] rounded-lg font-display text-lg
        ${sel ? "bg-[var(--suzuki-red)] text-[var(--white)]" : "bg-[var(--bg-tertiary)] text-[var(--white)] border border-[var(--text-muted)]/30"}`}
    >
      {sel && <span className="mr-1">✓</span>}{h}
    </button>
  );
}

function isPastSlot(fecha: string, hora: string, now: Date): boolean {
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const slotDate = new Date(y, m - 1, d, h, min, 0, 0);
  return slotDate.getTime() < now.getTime();
}
