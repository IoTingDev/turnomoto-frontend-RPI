// Mock data and types matching the real backend schema (FastAPI + SQLAlchemy).
// In production, these come via REST API + WebSocket from the backend.

export interface Cliente {
  id: number;
  nombre: string;
  documento: string;
  telefono: string;
  email: string | null;
  activo: boolean;
  created_at: string;
}

export interface Moto {
  id: number;
  cliente_id: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  kilometraje: number;
}

export interface ClienteConMotos extends Cliente {
  motos: Moto[];
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracion_min: number;
  activo: boolean;
  icono: string;
}

export interface Cita {
  id: number;
  cliente_id: number;
  moto_id: number;
  servicio_id: number;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmada" | "en_proceso" | "completada" | "cancelada";
  numero_turno: string;
  notas: string | null;
  created_at: string;
}

export const SERVICIOS: Servicio[] = [
  { id: 1, nombre: "Cambio de aceite y filtro", descripcion: "", duracion_min: 45, activo: true, icono: "🛢️" },
  { id: 2, nombre: "Revisión 10.000 km", descripcion: "", duracion_min: 60, activo: true, icono: "🔧" },
  { id: 3, nombre: "Revisión 20.000 km", descripcion: "", duracion_min: 90, activo: true, icono: "🔩" },
  { id: 4, nombre: "Cambio de pastillas de freno", descripcion: "", duracion_min: 45, activo: true, icono: "🔴" },
  { id: 5, nombre: "Ajuste de cadena", descripcion: "", duracion_min: 30, activo: true, icono: "⛓️" },
  { id: 6, nombre: "Diagnóstico general", descripcion: "", duracion_min: 60, activo: true, icono: "🔍" },
];

export const CLIENTE_DEMO: ClienteConMotos = {
  id: 1,
  nombre: "Juan Pérez Ramírez",
  documento: "1144567890",
  telefono: "3001234567",
  email: "juan.perez@example.com",
  activo: true,
  created_at: "2025-01-15T10:00:00Z",
  motos: [
    {
      id: 1,
      cliente_id: 1,
      placa: "ABC12D",
      marca: "Suzuki",
      modelo: "GSX-R150 ABS",
      anio: 2024,
      color: "Negro",
      kilometraje: 8500,
    },
  ],
};

export const MODELOS_SUZUKI: Record<string, string[]> = {
  "AUTOMÁTICAS": ["Burgman 125", "Burgman FI", "Address NM", "Avenis"],
  "SEMIAUTOMÁTICAS": ["Viva FI ABS"],
  "SPORT": [
    "GN 125 ABS", "GN 160", "AX4 ABS", "Gixxer FI 150 ABS",
    "Gixxer SF FI 150 ABS", "Gixxer 250", "Gixxer SF 250",
    "GSX-S150 ABS", "GSX-R150 ABS",
  ],
  "ENDURO": ["DR 150", "DR 150 ABS", "DR 150 FI ABS", "DR 160X", "DR-Z4S"],
  "OTRO": ["Otro"],
};

// Colombian holidays 2026
export const FESTIVOS_2026 = new Set<string>([
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
  "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
  "2026-11-16", "2026-12-08", "2026-12-25",
]);

export const HORARIOS_MANANA = ["08:00", "09:00", "10:00", "11:00", "12:00"];
export const HORARIOS_TARDE = ["14:00", "15:00", "16:00"];

// Horarios disponibles por día de semana (0 = Domingo, 6 = Sábado).
// Lunes-Viernes: jornada completa. Sábado: solo mañana hasta 11 AM (cierre a 12).
// Domingos no aparece en el picker por la lógica de getProximosDias.
export const HORARIOS_POR_DIA: Record<number, string[]> = {
  1: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
  2: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
  3: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
  4: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
  5: ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
  6: ["08:00", "09:00", "10:00", "11:00"],
};

export function horariosDelDia(fecha: string): { manana: string[]; tarde: string[] } {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay();
  const horarios = HORARIOS_POR_DIA[dayOfWeek] ?? [];
  const manana: string[] = [];
  const tarde: string[] = [];
  for (const h of horarios) {
    const hour = parseInt(h.split(":")[0]);
    if (hour < 14) manana.push(h);
    else tarde.push(h);
  }
  return { manana, tarde };
}

// Mock occupied slots: key = `${fecha}_${hora}`
export function getOcupados(fecha: string, diasHabiles: string[]): Set<string> {
  const ocupados = new Set<string>();
  const idx = diasHabiles.indexOf(fecha);
  if (idx === 0) { ocupados.add("10:00"); ocupados.add("15:00"); }
  else if (idx === 1) { ocupados.add("09:00"); ocupados.add("11:00"); }
  else if (idx >= 0) {
    // deterministic 1-2 random
    const seed = fecha.split("-").reduce((a, b) => a + parseInt(b), 0);
    const all = [...HORARIOS_MANANA, ...HORARIOS_TARDE];
    ocupados.add(all[seed % all.length]);
  }
  return ocupados;
}

export const TURNOS_DEMO_MECANICO = [
  { hora: "08:00", turno: "T-036", cliente: "Andrés Felipe Muñoz", moto: "GSX-R150 ABS", placa: "FGH34E", servicio: "Cambio de aceite y filtro", estado: "completada" as const },
  { hora: "09:00", turno: "T-037", cliente: "María Camila Ospina", moto: "Gixxer 250", placa: "JKL56F", servicio: "Revisión 10.000 km", estado: "completada" as const },
  { hora: "10:00", turno: "T-038", cliente: "Carlos Alberto Henao", moto: "V-Strom 250", placa: "MNO78G", servicio: "Diagnóstico general", estado: "en_proceso" as const },
  { hora: "10:00", turno: "T-039", cliente: "Laura Valentina Ríos", moto: "Address NM", placa: "PQR90H", servicio: "Ajuste de cadena", estado: "en_proceso" as const },
  { hora: "11:00", turno: "T-040", cliente: "Juan Pérez Ramírez", moto: "GSX-R150 ABS", placa: "ABC12D", servicio: "Cambio de aceite y filtro", estado: "pendiente" as const },
  { hora: "14:00", turno: "T-041", cliente: "Diego Alejandro Vargas", moto: "DR 150 ABS", placa: "STU12I", servicio: "Cambio de pastillas de freno", estado: "pendiente" as const },
  { hora: "15:00", turno: "T-042", cliente: "Valentina Restrepo Gil", moto: "GN 125 ABS", placa: "VWX34J", servicio: "Revisión 10.000 km", estado: "pendiente" as const },
  { hora: "16:00", turno: "T-043", cliente: "Santiago Castaño López", moto: "AX4 ABS", placa: "YZA56K", servicio: "Diagnóstico general", estado: "pendiente" as const },
];

// Build next N working days (skip Sundays + holidays included but marked separately)
export function getProximosDias(n = 7): Array<{ fecha: string; dia: string; num: string; festivo: boolean; isToday: boolean; }> {
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const result: Array<{ fecha: string; dia: string; num: string; festivo: boolean; isToday: boolean; }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  while (result.length < n) {
    if (d.getDay() !== 0) {
      const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      result.push({
        fecha,
        dia: dias[d.getDay()],
        num: String(d.getDate()),
        festivo: FESTIVOS_2026.has(fecha),
        isToday: d.getTime() === today.getTime(),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return result;
}

export function formatFechaLarga(fecha: string): string {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${dias[date.getDay()]} ${d} de ${meses[m - 1]}, ${y}`;
}

// Iconos de servicios — metadata de UI, mantenida en frontend (no viaja por el backend)
export const ICONOS_SERVICIOS: Record<string, string> = {
  "Cambio de aceite y filtro": "🛢️",
  "Revisión 10.000 km": "🔧",
  "Revisión 20.000 km": "🔩",
  "Cambio de pastillas de freno": "🔴",
  "Ajuste de cadena": "⛓️",
  "Diagnóstico general": "🔍",
};

export function iconoServicio(nombre: string): string {
  return ICONOS_SERVICIOS[nombre] ?? "🔧";
}
