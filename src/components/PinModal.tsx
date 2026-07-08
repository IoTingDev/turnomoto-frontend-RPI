import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/lib/admin-auth";

export function PinModal({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const login = useAdminAuth((s) => s.login);
  const navigate = useNavigate();

  const isLocked = lockSeconds > 0;

  useEffect(() => {
    if (lockSeconds <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setLockSeconds((s) => {
        if (s <= 1) {
          setError(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lockSeconds > 0]);

  const flashKey = (k: string) => {
    setPressedKey(k);
    setTimeout(() => setPressedKey((cur) => (cur === k ? null : cur)), 150);
  };

  const handleDigit = (d: string) => {
    if (isLocked) return;
    flashKey(d);
    if (pin.length < 6) setPin((p) => p + d);
  };

  const handleBackspace = () => {
    if (isLocked) return;
    flashKey("del");
    setPin((p) => p.slice(0, -1));
  };

  const extractLockSeconds = (message: string): number | null => {
    const match = message.match(/Espera\s+(\d+)s/i);
    return match ? parseInt(match[1], 10) : null;
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    setLoading(true);
    setError(null);
    const result = await login(pin);
    setLoading(false);

    if (!result.ok) {
      const errMsg = result.error ?? "PIN incorrecto";
      const secs = extractLockSeconds(errMsg);
      if (secs) setLockSeconds(secs);
      setError(errMsg);
      setPin("");
      return;
    }

    const role = useAdminAuth.getState().role;
    onClose();
    navigate({ to: role === "gerencia" ? "/dashboard" : "/mecanico" });
  };

  const displayError = isLocked
    ? `Demasiados intentos. Espera ${lockSeconds}s`
    : error;

  const keyClass = (k: string) =>
    `h-14 rounded-lg text-xl font-medium transition-colors duration-100 ${
      pressedKey === k
        ? "bg-[var(--suzuki-blue)] text-white"
        : "bg-[var(--bg-tertiary)] text-[var(--white)] active:bg-[var(--suzuki-blue)] active:text-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 w-80 shadow-xl border border-[var(--text-muted)]/20">
        <h2 className="text-lg font-semibold mb-4 text-center text-[var(--white)]">
          Acceso restringido
        </h2>

        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-[var(--suzuki-blue)] border-[var(--suzuki-blue)]"
                  : "bg-transparent border-[var(--text-muted)]"
              }`}
            />
          ))}
        </div>

        {displayError && (
          <p className="text-[var(--suzuki-red)] text-sm text-center mb-3 font-medium">
            {displayError}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} onClick={() => handleDigit(d)} disabled={isLocked} className={`${keyClass(d)} disabled:opacity-30`}>
              {d}
            </button>
          ))}
          <button
            onClick={onClose}
            className="h-14 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-medium active:scale-95"
          >
            Cancelar
          </button>
          <button onClick={() => handleDigit("0")} disabled={isLocked} className={`${keyClass("0")} disabled:opacity-30`}>
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isLocked}
            className={`${keyClass("del")} text-lg disabled:opacity-30`}
          >
            ⌫
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading || isLocked}
          className="w-full h-12 rounded-lg bg-[var(--suzuki-blue)] text-white font-semibold disabled:opacity-40 disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] active:scale-95 transition-transform"
        >
          {isLocked ? `Bloqueado (${lockSeconds}s)` : loading ? "Verificando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}
