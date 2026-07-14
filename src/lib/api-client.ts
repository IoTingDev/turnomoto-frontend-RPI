// src/lib/api-client.ts
// Typed fetch wrapper for the TurnoMoto backend.
import { API_BASE } from "./api-config";
import { useAdminAuth } from "./admin-auth";

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    const token = useAdminAuth.getState().token;
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiError(0, "No hay conexión con el servidor", err);
  }

  if (!response.ok) {
    let detail: unknown;
    try { detail = await response.json(); } catch { /* ignore */ }
    const msg =
      (detail as { detail?: string })?.detail ??
      response.statusText ??
      `Error ${response.status}`;
    throw new ApiError(response.status, String(msg), detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};

// ===== Endpoint signatures matching backend schemas =====

export interface CitaCreate {
  cliente_id: number;
  moto_id: number;
  servicio_id: number;
  fecha_hora: string; // ISO 8601, naive (workshop local time)
  notas?: string | null;
}

export interface CitaResponse {
  id: number;
  cliente_id: number;
  moto_id: number;
  servicio_id: number;
  fecha_hora: string;
  estado: string;
  notas: string | null;
  fecha_creacion: string;
}

export function crearCita(payload: CitaCreate): Promise<CitaResponse> {
  return api.post<CitaResponse>("/citas", payload);
}

// ===== POST /clientes (Fase 3) =====

export interface MotoCreatePayload {
  placa: string;
  marca?: string;
  modelo: string;
  anio: number;
  color?: string | null;
  kilometraje?: number | null;
}

export interface ClienteCreatePayload {
  nombre: string;
  documento: string;
  telefono: string;
  email?: string | null;
  nfc_uid?: string | null;
  moto: MotoCreatePayload;
}

export interface MotoResponseItem {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  kilometraje: number | null;
}

export interface ClienteResponse {
  id: number;
  nombre: string;
  documento: string;
  telefono: string;
  email: string | null;
  motos: MotoResponseItem[];
}

export function crearCliente(payload: ClienteCreatePayload): Promise<ClienteResponse> {
  return api.post<ClienteResponse>("/clientes", payload);
}

// ===== Citas del cliente y cancelación (Fase 3.6) =====

export function listarCitasCliente(clienteId: number): Promise<CitaResponse[]> {
  return api.get<CitaResponse[]>(`/clientes/${clienteId}/citas`);
}

// ===== Fase 5.9: Calificación CSAT =====
export interface CalificacionData { estrellas: number; comentario: string | null; }
export function enviarCalificacion(citaId: number, estrellas: number, comentario: string): Promise<{ id: number; cita_id: number; estrellas: number; comentario: string | null }> {
  return api.post(`/calificaciones`, { cita_id: citaId, estrellas, comentario });
}

export function cancelarCita(citaId: number): Promise<CitaResponse> {
  return api.post<CitaResponse>(`/citas/${citaId}/cancelar`, {});
}

// ===== PATCH /clientes/{id} y PATCH /motos/{id} (recovery 3.5) =====

export interface ClienteUpdatePayload {
  nombre?: string;
  telefono?: string;
  email?: string | null;
}

export interface MotoUpdatePayload {
  placa?: string;
  modelo?: string;
  anio?: number;
  color?: string | null;
  kilometraje?: number | null;
}

export function actualizarCliente(id: number, payload: ClienteUpdatePayload): Promise<ClienteResponse> {
  return api.patch<ClienteResponse>(`/clientes/${id}`, payload);
}

export function actualizarMoto(id: number, payload: MotoUpdatePayload): Promise<MotoResponseItem> {
  return api.patch<MotoResponseItem>(`/motos/${id}`, payload);
}

// ===== Fase 4: catálogo de servicios y slots ocupados =====

export interface ServicioResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  duracion_minutos: number;
}

export function listarServicios(): Promise<ServicioResponse[]> {
  return api.get<ServicioResponse[]>("/servicios");
}

export interface HorariosOcupadosResponse {
  fecha: string;
  ocupados: string[]; // ["09:00", "10:00", ...]
}

export function horariosOcupados(fecha: string): Promise<HorariosOcupadosResponse> {
  return api.get<HorariosOcupadosResponse>(`/citas/ocupados?fecha=${encodeURIComponent(fecha)}`);
}

// ===== Fase 5: pantalla del mecánico =====

export interface CitaTaller {
  id: number;
  turno: string;
  fecha_hora: string;
  hora: string;
  estado: "pendiente" | "confirmada" | "en_proceso" | "completada" | "cancelada";
  notas: string | null;
  cliente: { id: number; nombre: string; telefono: string };
  moto: { id: number; placa: string; marca: string; modelo: string };
  servicio: { id: number; nombre: string; duracion_minutos: number };
}

export function listarCitasDelDia(fecha: string): Promise<CitaTaller[]> {
  return api.get<CitaTaller[]>(`/citas?fecha=${encodeURIComponent(fecha)}`);
}

export type EstadoCita = "pendiente" | "confirmada" | "en_proceso" | "completada" | "cancelada" | "no_asistio";

export function actualizarEstadoCita(citaId: number, estado: EstadoCita) {
  return api.patch(`/citas/${citaId}/estado`, { estado });
}

// ===== Gerencia (Business Intelligence) =====
export interface ResumenGerencia {
  periodo: { desde: string; hasta: string; dias: number };
  kpis: {
    citas_total: { valor: number; delta_pct: number | null };
    cumplimiento_pct: { valor: number | null; delta_pts: number | null };
    ausentismo_pct: { valor: number | null; delta_pts: number | null };
    clientes: { total: number; nuevos: number; recurrentes: number };
    satisfaccion: { valor: number | null; delta: number | null; n: number };
  };
  citas_por_dia: Array<{ fecha: string; completada: number; pendiente: number; cancelada: number; no_asistio: number }>;
  estados: Record<string, number>;
  top_servicios: Array<{ nombre: string; total: number }>;
  satisfaccion_tendencia: Array<{ semana: string; promedio: number }>;
  comentarios_recientes: Array<{ estrellas: number; comentario: string; servicio: string }>;
}

export function obtenerResumenGerencia(desde: string, hasta: string): Promise<ResumenGerencia> {
  const qs = new URLSearchParams({ desde, hasta }).toString();
  return api.get<ResumenGerencia>(`/gerencia/resumen?${qs}`);
}
