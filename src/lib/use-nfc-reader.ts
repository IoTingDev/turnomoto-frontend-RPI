// src/lib/use-nfc-reader.ts
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "./store";
import { WS_NFC_URL } from "./api-config";
import type { ClienteConMotos } from "./mock-data";

// Matches backend NfcEventOut (Pydantic schema in app/schemas.py)
interface NfcEvent {
  event_type: "nfc_read";
  timestamp: string;
  uid: string;
  cliente: ClienteConMotos | null;
  lectura_id: number;
}

export type WsStatus = "connecting" | "connected" | "disconnected";

/**
 * Subscribes to /ws/nfc on the backend. When an NFC event arrives:
 *  - if the UID resolves to a registered client → startFlowRegistered + navigate("/servicios")
 *  - if not → startFlowNew + setCurrentNfcUid(uid) + navigate("/registro")
 *
 * Auto-reconnects with exponential backoff (capped at 10s).
 */
export function useNfcReader(enabled = true) {
  const navigate = useNavigate();
  const startFlowRegistered = useAppStore((s) => s.startFlowRegistered);
  const startFlowNew = useAppStore((s) => s.startFlowNew);
  const setCurrentNfcUid = useAppStore((s) => s.setCurrentNfcUid);
  const [status, setStatus] = useState<WsStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");

      const ws = new WebSocket(WS_NFC_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        setStatus("connected");
        attemptsRef.current = 0;
        console.log("[NFC] WS conectado:", WS_NFC_URL);
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          if (data?.event_type !== "nfc_read") return;
          const event = data as NfcEvent;
          console.log("[NFC] evento:", event.uid, event.cliente ? "registrado" : "nuevo");
          setCurrentNfcUid(event.uid);
          if (event.cliente) {
            startFlowRegistered(event.cliente);
            navigate({ to: "/servicios" });
          } else {
            startFlowNew();
            navigate({ to: "/registro" });
          }
        } catch (err) {
          console.warn("[NFC] error parseando evento:", err);
        }
      };

      ws.onerror = () => { /* onclose fires next and handles reconnect */ };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("disconnected");
        wsRef.current = null;
        const attempt = attemptsRef.current;
        const delay = Math.min(10000, 1000 * Math.pow(2, attempt));
        attemptsRef.current = attempt + 1;
        console.log(`[NFC] WS desconectado, reintento en ${delay}ms`);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, navigate, startFlowRegistered, startFlowNew, setCurrentNfcUid]);

  return { status };
}
