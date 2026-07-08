import { useEffect, useRef } from "react";

export function useIdleTimer(timeoutMs: number, onIdle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, timeoutMs);
    };

    const events = ["touchstart", "mousedown", "keydown", "click"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMs, onIdle]);
}
