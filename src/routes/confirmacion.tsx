import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatFechaLarga } from "@/lib/mock-data";
import { crearCita, ApiError, type CitaResponse } from "@/lib/api-client";

export const Route = createFileRoute("/confirmacion")({
  head: () => ({ meta: [{ title: "Cita confirmada — Agenda Suzuki" }] }),
  component: Confirmacion,
});

type Status = "submitting" | "success" | "error";

function Confirmacion() {
  const navigate = useNavigate();
  const { currentClient, selectedMoto, selectedServicio, selectedFecha, selectedHora, resetFlow } = useAppStore();
  const [status, setStatus] = useState<Status>("submitting");
  const [cita, setCita] = useState<CitaResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [horarioOcupado, setHorarioOcupado] = useState(false);
  const [count, setCount] = useState(25);
  const submittedOnceRef = useRef(false);

  const submit = async () => {
    if (!currentClient || !selectedMoto || !selectedServicio || !selectedFecha || !selectedHora) return;
    setStatus("submitting");
    setErrorMsg("");
    setHorarioOcupado(false);
    try {
      const fecha_hora = `${selectedFecha}T${selectedHora}:00`;
      const created = await crearCita({
        cliente_id: currentClient.id,
        moto_id: selectedMoto.id,
        servicio_id: selectedServicio.id,
        fecha_hora,
        notas: null,
      });
      console.log("[CITA] creada:", created);
      setCita(created);
      setStatus("success");
    } catch (err) {
      console.error("[CITA] error:", err);
      if (err instanceof ApiError) {
        if (err.status === 0) {
          setErrorMsg("No hay conexión con el servidor. Verifique la red e intente de nuevo.");
        } else if (err.status === 409 && err.message.toLowerCase().includes("horario")) {
          setErrorMsg(err.message);
          setHorarioOcupado(true);
        } else {
          setErrorMsg(`${err.message} (código ${err.status})`);
        }
      } else {
        setErrorMsg("Error desconocido al confirmar la cita.");
      }
      setStatus("error");
    }
  };

  // Guard: redirect to idle if any required state is missing
  useEffect(() => {
    if (!currentClient || !selectedMoto || !selectedServicio || !selectedFecha || !selectedHora) {
      navigate({ to: "/" });
    }
  }, [currentClient, selectedMoto, selectedServicio, selectedFecha, selectedHora, navigate]);

  // Submit once on mount
  useEffect(() => {
    if (submittedOnceRef.current) return;
    submittedOnceRef.current = true;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown only when success
  useEffect(() => {
    if (status !== "success") return;
    const t = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status === "success" && count <= 0) {
      resetFlow();
      navigate({ to: "/" });
    }
  }, [count, status, navigate, resetFlow]);

  if (!currentClient || !selectedServicio || !selectedFecha || !selectedHora) return null;

  const horaFmt = (() => {
    const [h, m] = selectedHora.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  })();

  const turnoLabel = cita ? `T-${String(cita.id).padStart(3, "0")}` : "T-000";

  return (
    <div className="bg-carbon min-h-screen flex flex-col items-center justify-start px-4 py-6 animate-slide-in">
      {status === "submitting" && (
        <div className="flex flex-col items-center justify-center mt-20">
          <div className="w-20 h-20 rounded-full border-4 border-[var(--suzuki-blue)] border-t-transparent animate-spin" />
          <p className="font-display text-xl text-[var(--white)] mt-6">Confirmando su cita...</p>
          <p className="font-body text-sm text-[var(--text-muted)] mt-2">Un momento, por favor</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center mt-12 w-full max-w-md">
          <div className="w-20 h-20 rounded-full bg-[var(--suzuki-red)]/20 border-2 border-[var(--suzuki-red)] flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="font-display text-2xl text-[var(--white)] mt-6 text-center">No fue posible confirmar la cita</h2>
          <p className="font-body text-sm text-[var(--text-muted)] mt-3 text-center max-w-sm">{errorMsg}</p>
          {horarioOcupado ? (
            <button
              onClick={() => navigate({ to: "/agenda" })}
              className="touch-btn mt-6 h-14 px-10 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display text-lg w-full"
            >
              ← Cambiar horario
            </button>
          ) : (
            <button
              onClick={submit}
              className="touch-btn mt-6 h-14 px-10 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display text-lg w-full"
            >
              Reintentar
            </button>
          )}
          <button
            onClick={() => { resetFlow(); navigate({ to: "/" }); }}
            className="touch-btn mt-3 h-14 px-10 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] font-display text-base w-full"
          >
            Volver al inicio
          </button>
        </div>
      )}

      {status === "success" && (
        <>
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

          <h2 className="font-display text-2xl md:text-3xl text-[var(--white)] mt-4 opacity-0" style={{ animation: "scale-in 400ms ease-out 900ms forwards" }}>
            ¡Cita agendada con éxito!
          </h2>

          <div className="mt-4 opacity-0" style={{ animation: "scale-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 1100ms forwards" }}>
            <p className="font-display font-bold text-5xl md:text-6xl text-[var(--suzuki-red)] text-center leading-none">
              {turnoLabel}
            </p>
          </div>

          <div className="mt-6 w-full max-w-md bg-[var(--bg-secondary)] border-l-4 border-[var(--success)] rounded-lg p-5 space-y-2">
            <p className="font-body text-[var(--white)]">👤 {currentClient.nombre}</p>
            <p className="font-body text-[var(--white)]">🏍️ {selectedMoto?.modelo} — {selectedMoto?.placa}</p>
            <p className="font-body text-[var(--white)]">{selectedServicio.icono} {selectedServicio.nombre}</p>
            <p className="font-body text-[var(--white)]">📅 {formatFechaLarga(selectedFecha)}</p>
            <p className="font-body text-[var(--white)]">🕐 {horaFmt}</p>
          </div>

          <p className="text-[var(--text-muted)] text-sm mt-4 text-center">
            Recuerde llegar 10 minutos antes de su cita
          </p>

          <p className="text-[var(--white)] mt-6 text-center">
            Volviendo al inicio en <span className="font-display font-bold text-[var(--suzuki-red)]">{Math.max(0, count)}</span> segundos...
          </p>

          <button
            onClick={() => { resetFlow(); navigate({ to: "/" }); }}
            className="touch-btn mt-4 h-14 px-10 rounded-lg bg-[var(--suzuki-red)] text-[var(--white)] font-display text-lg"
          >
            Listo ✓
          </button>
        </>
      )}
    </div>
  );
}
