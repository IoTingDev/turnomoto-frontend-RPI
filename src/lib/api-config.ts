// src/lib/api-config.ts
// Backend URL configuration.
// Priority: VITE_BACKEND_URL env var > derived from window.location > localhost fallback.

function getBackendBase(): string {
  // 1. Build-time override via Vite env var
  // @ts-ignore — import.meta.env is provided by Vite
  const envUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_BACKEND_URL : undefined;
  if (envUrl) return String(envUrl).replace(/\/$/, "");

  // 2. Browser: derive from current hostname (works for localhost AND LAN IP access)
  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  // 3. SSR fallback (will be replaced on client hydration)
  return "http://localhost:8000";
}

const BASE = getBackendBase();

export const API_BASE = BASE;
export const WS_NFC_URL = `${BASE.replace(/^http/, "ws")}/ws/nfc`;
export const WS_TALLER_URL = `${BASE.replace(/^http/, "ws")}/ws/taller`;
