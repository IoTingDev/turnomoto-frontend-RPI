import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

/**
 * Global 60s idle timeout for kiosk flow screens.
 * Shows warning overlay at 50s, navigates to "/" at 60s.
 */
export function useIdleTimeout(enabled = true) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastActivity = useRef(Date.now());
  const warningRef = useRef<HTMLDivElement | null>(null);
  const countdownRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    lastActivity.current = Date.now();
    const reset = () => { lastActivity.current = Date.now(); if (warningRef.current) warningRef.current.style.display = "none"; };
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastActivity.current) / 1000;
      if (elapsed >= 60) {
        navigate({ to: "/" });
        lastActivity.current = Date.now();
      } else if (elapsed >= 50) {
        if (warningRef.current) {
          warningRef.current.style.display = "flex";
          if (countdownRef.current) countdownRef.current.textContent = String(Math.max(0, 60 - Math.floor(elapsed)));
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [enabled, pathname, navigate]);

  return { warningRef, countdownRef };
}

export function IdleOverlay({ warningRef, countdownRef }: { warningRef: React.RefObject<HTMLDivElement | null>; countdownRef: React.RefObject<HTMLSpanElement | null>; }) {
  return (
    <div
      ref={warningRef}
      style={{ display: "none" }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm items-center justify-center"
    >
      <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl text-center border border-[var(--suzuki-red)]/40">
        <p className="font-display text-2xl text-white">¿Sigue ahí?</p>
        <p className="font-body text-[var(--text-muted)] mt-2">Toque la pantalla para continuar</p>
        <p className="font-display text-5xl text-[var(--suzuki-red)] mt-4">
          <span ref={countdownRef}>10</span>
        </p>
      </div>
    </div>
  );
}
