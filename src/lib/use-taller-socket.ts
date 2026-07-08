import { useEffect, useRef } from "react";
import { WS_TALLER_URL } from "./api-config";

/**
 * Suscribe al WebSocket /ws/taller del backend.
 * Llama `onEvent` cuando llega un evento del servidor (cita_creada, cita_estado_cambiado, cita_cancelada).
 * Auto-reconecta con backoff exponencial (cap 10s).
 */
export function useTallerSocket(onEvent: (event: { event_type: string; [k: string]: any }) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(WS_TALLER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        attemptsRef.current = 0;
        console.log("[TALLER] WS conectado:", WS_TALLER_URL);
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          if (data?.event_type) {
            console.log("[TALLER] evento:", data);
            handlerRef.current(data);
          }
        } catch (err) {
          console.warn("[TALLER] error parseando evento:", err);
        }
      };

      ws.onerror = () => { /* onclose handles reconnect */ };

      ws.onclose = () => {
        if (cancelled) return;
        wsRef.current = null;
        const attempt = attemptsRef.current;
        const delay = Math.min(10000, 1000 * Math.pow(2, attempt));
        attemptsRef.current = attempt + 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);
}
