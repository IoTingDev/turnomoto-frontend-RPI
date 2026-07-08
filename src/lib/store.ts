import { create } from "zustand";
import type { ClienteConMotos, Moto, Servicio } from "./mock-data";

interface AppState {
  currentClient: ClienteConMotos | null;
  currentNfcUid: string | null;
  selectedMoto: Moto | null;
  selectedServicio: Servicio | null;
  selectedFecha: string | null;
  selectedHora: string | null;
  turnoCounter: number;
  lastTurno: string | null;

  setCurrentNfcUid: (uid: string | null) => void;
  startFlowRegistered: (client: ClienteConMotos) => void;
  startFlowNew: () => void;
  setClient: (client: ClienteConMotos) => void;
  setServicio: (s: Servicio) => void;
  setFechaHora: (fecha: string, hora: string) => void;
  generateTurno: () => string;
  resetFlow: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentClient: null,
  currentNfcUid: null,
  selectedMoto: null,
  selectedServicio: null,
  selectedFecha: null,
  selectedHora: null,
  turnoCounter: 0,
  lastTurno: null,

  setCurrentNfcUid: (uid) => set({ currentNfcUid: uid }),

  startFlowRegistered: (client) =>
    set({
      currentClient: client,
      selectedMoto: client.motos[0] ?? null,
      selectedServicio: null,
      selectedFecha: null,
      selectedHora: null,
    }),

  startFlowNew: () =>
    set({
      currentClient: null,
      selectedMoto: null,
      selectedServicio: null,
      selectedFecha: null,
      selectedHora: null,
    }),

  setClient: (client) => set({ currentClient: client, selectedMoto: client.motos[0] ?? null }),
  setServicio: (s) => set({ selectedServicio: s }),
  setFechaHora: (fecha, hora) => set({ selectedFecha: fecha, selectedHora: hora }),

  generateTurno: () => {
    const next = get().turnoCounter + 1;
    const turno = `T-${String(next).padStart(3, "0")}`;
    set({ turnoCounter: next, lastTurno: turno });
    return turno;
  },

  resetFlow: () =>
    set({
      currentClient: null,
      currentNfcUid: null,
      selectedMoto: null,
      selectedServicio: null,
      selectedFecha: null,
      selectedHora: null,
    }),
}));
