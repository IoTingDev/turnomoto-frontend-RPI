import { create } from "zustand";
import { API_BASE } from "./api-config";

type Role = "mecanico" | "gerencia" | null;

interface AdminAuthState {
  token: string | null;
  role: Role;
  expiresAt: number | null;
  login: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isValid: () => boolean;
}

export const useAdminAuth = create<AdminAuthState>((set, get) => ({
  token: null,
  role: null,
  expiresAt: null,

  login: async (pin: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.detail ?? "Error de autenticación" };
      }

      const data = await res.json();
      set({
        token: data.token,
        role: data.role,
        expiresAt: Date.now() + data.expires_in * 1000,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo conectar al servidor" };
    }
  },

  logout: () => set({ token: null, role: null, expiresAt: null }),

  isValid: () => {
    const { token, expiresAt } = get();
    return !!token && !!expiresAt && expiresAt > Date.now();
  },
}));
