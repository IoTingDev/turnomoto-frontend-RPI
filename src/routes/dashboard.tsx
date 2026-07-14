import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { obtenerResumenGerencia, type ResumenGerencia } from "@/lib/api-client";
import { useTallerSocket } from "@/lib/use-taller-socket";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Gerencia — Agenda de Taller Suzuki" }] }),
  component: Dashboard,
});

type Periodo = "hoy" | "semana" | "mes";

const C = {
  completada: "#003399", pendiente: "#6B9BD1", cancelada: "#CBD3DD",
  no_asistio: "#CC0000", verde: "#3B6D11", rojo: "#A32D2D", azul: "#185FA5",
};

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setVal(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return val;
}

function rangoDe(periodo: Periodo): { desde: string; hasta: string } {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth(), d = hoy.getDate();
  const fin = new Date(y, m, d, 23, 59, 59);
  let ini: Date;
  if (periodo === "hoy") ini = new Date(y, m, d, 0, 0, 0);
  else if (periodo === "semana") { const dow = (hoy.getDay() + 6) % 7; ini = new Date(y, m, d - dow, 0, 0, 0); }
  else ini = new Date(y, m, 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
  return { desde: fmt(ini), hasta: fmt(fin) };
}

function fmtDia(f: string): string {
  const p = String(f).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : String(f);
}

function Dashboard() {
  useAdminGuard(["gerencia"]);
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [data, setData] = useState<ResumenGerencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true); setError(null);
    const { desde, hasta } = rangoDe(periodo);
    obtenerResumenGerencia(desde, hasta)
      .then((r) => { if (!cancel) setData(r); })
      .catch((e) => { if (!cancel) setError(e?.message ?? "Error al cargar"); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [periodo, nonce]);

  const [flash, setFlash] = useState(false);
  useTallerSocket((ev) => {
    if (ev.event_type === "cita_estado_cambiado" || ev.event_type === "cita_creada" || ev.event_type === "cita_cancelada") {
      setNonce((n) => n + 1);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    }
  });

  const k = data?.kpis;
  const sinDatos = !!data && data.kpis.citas_total.valor === 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--white)]">
      <header data-no-print className="px-6 py-5 border-b border-[var(--text-muted)]/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate({ to: "/" })} className="touch-btn h-11 px-4 rounded-lg bg-[var(--bg-tertiary)] text-sm font-display">← Volver al kiosko</button>
          <h1 className="font-display font-bold text-xl md:text-2xl">📊 Panel de gerencia</h1>
        </div>
        <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
          {(["hoy", "semana", "mes"] as Periodo[]).map((p) => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`touch-btn h-10 px-4 rounded-md font-display text-sm ${periodo === p ? "bg-[var(--suzuki-blue)] text-white" : "text-[var(--text-muted)]"}`}>
              {p === "hoy" ? "Hoy" : p === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="touch-btn h-10 px-4 rounded-lg bg-[var(--suzuki-blue)] text-white text-sm font-display ml-2">🖨 Exportar PDF</button>
      </header>

      <div className="print-header hidden">
        <h1>Panel de gerencia — Concesionario Suzuki</h1>
        <p>Período: {periodo === "hoy" ? "Hoy" : periodo === "semana" ? "Esta semana" : "Este mes"} · Generado: {new Date().toLocaleString("es-CO")}</p>
      </div>
      <main className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {loading && <div className="py-20 text-center text-[var(--text-muted)] font-display">Cargando datos…</div>}
        {error && !loading && (
          <div className="py-16 text-center">
            <p className="text-[var(--suzuki-red)] font-display text-lg">No se pudieron cargar los datos</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">{error}</p>
            <button onClick={() => setNonce((n) => n + 1)} className="touch-btn mt-4 h-10 px-4 rounded-lg bg-[var(--suzuki-blue)] text-white text-sm">Reintentar</button>
          </div>
        )}
        {data && !loading && !error && (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ${flash ? "ring-2 ring-[var(--suzuki-blue)] ring-offset-2 rounded-xl" : ""}`}>
              <KpiCard label="Citas del período" value={k!.citas_total.valor} delta={k!.citas_total.delta_pct} deltaUnit="%" />
              <KpiCard label="Cumplimiento" value={k!.cumplimiento_pct.valor} suffix="%" delta={k!.cumplimiento_pct.delta_pts} deltaUnit=" pts" />
              <KpiCard label="Ausentismo" value={k!.ausentismo_pct.valor} suffix="%" delta={k!.ausentismo_pct.delta_pts} deltaUnit=" pts" invert valueColor={(k!.ausentismo_pct.valor ?? 0) > 15 ? C.rojo : undefined} />
              <KpiCard label="Clientes" value={k!.clientes.total} subtitle={`${k!.clientes.nuevos} nuevos · ${k!.clientes.recurrentes} recurrentes`} />
            </div>

            {sinDatos ? (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-10 border border-[var(--text-muted)]/15 text-center">
                <p className="font-display text-lg">Aún no hay citas en este período</p>
                <p className="text-[var(--text-muted)] text-sm mt-1">Elija otro rango en el filtro superior.</p>
              </div>
            ) : (
              <>
                <ChartCard title="Citas por día · por estado">
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] mb-3">
                    <LegendDot color={C.completada} label="Completada" />
                    <LegendDot color={C.pendiente} label="Pendiente" />
                    <LegendDot color={C.cancelada} label="Cancelada" />
                    <LegendDot color={C.no_asistio} label="No asistió" />
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.citas_por_dia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7ECF2" vertical={false} />
                      <XAxis dataKey="fecha" tickFormatter={fmtDia} stroke="#5B6673" fontSize={11} interval="preserveStartEnd" minTickGap={16} />
                      <YAxis stroke="#5B6673" fontSize={11} allowDecimals={false} />
                      <Tooltip labelFormatter={fmtDia} contentStyle={{ background: "#FFFFFF", border: "1px solid #E7ECF2", borderRadius: 8, color: "#0F1A2A", fontSize: 12 }} />
                      <Bar dataKey="completada" stackId="a" fill={C.completada} />
                      <Bar dataKey="pendiente" stackId="a" fill={C.pendiente} />
                      <Bar dataKey="cancelada" stackId="a" fill={C.cancelada} />
                      <Bar dataKey="no_asistio" stackId="a" fill={C.no_asistio} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Top servicios">
                    <div className="space-y-3 pt-1">
                      {data.top_servicios.length === 0 && <p className="text-[var(--text-muted)] text-sm">Sin datos.</p>}
                      {data.top_servicios.map((s, i) => {
                        const max = data.top_servicios[0]?.total || 1;
                        const pct = Math.round((s.total / max) * 100);
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm text-[var(--text-muted)] mb-1"><span>{s.nombre}</span><span>{s.total}</span></div>
                            <div className="h-2 rounded-full bg-[var(--bg-tertiary)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.completada }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </ChartCard>

                  <div className="relative bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--text-muted)]/25 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display text-lg text-[var(--white)]">Ingresos</h3>
                      <span className="text-xs px-3 py-1 rounded-full text-white flex items-center gap-1" style={{ background: C.azul }}>🔒 Vista previa · Fase 2</span>
                    </div>
                    <div className="blur-[3px] opacity-50 pointer-events-none select-none">
                      <p className="text-xs text-[var(--text-muted)]">Ingresos del mes</p>
                      <p className="font-display font-bold text-3xl text-[var(--white)]">$4.820.000</p>
                      <div className="flex gap-6 mt-2 text-sm text-[var(--text-muted)]">
                        <span>Ticket promedio<br /><b className="text-[var(--white)]">$201.000</b></span>
                        <span>Proyección<br /><b className="text-[var(--white)]">$6.1M</b></span>
                      </div>
                    </div>
                    <p className="mt-3 pt-3 border-t border-[var(--text-muted)]/15 text-xs text-[var(--text-muted)] leading-relaxed">
                      Cargue los precios de sus servicios y este módulo calcula ingresos reales, ticket promedio y proyección mensual.
                    </p>
                  </div>
                </div>

                <ChartCard title="Satisfacción del cliente">
                  {data.kpis.satisfaccion.valor === null ? (
                    <p className="text-[var(--text-muted)] text-sm py-6 text-center">Aún sin calificaciones en este período.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="flex flex-col justify-center">
                        <div className="flex items-end gap-2">
                          <span className="font-display font-bold text-5xl text-[var(--white)]">{data.kpis.satisfaccion.valor.toFixed(1)}</span>
                          <span className="text-2xl mb-1" style={{ color: "#EF9F27" }}>
                            {"★".repeat(Math.round(data.kpis.satisfaccion.valor))}<span style={{ color: "var(--bg-tertiary)" }}>{"★".repeat(5 - Math.round(data.kpis.satisfaccion.valor))}</span>
                          </span>
                        </div>
                        {data.kpis.satisfaccion.delta !== null ? (
                          <p className="mt-1 text-sm" style={{ color: data.kpis.satisfaccion.delta >= 0 ? C.verde : C.rojo }}>
                            {data.kpis.satisfaccion.delta >= 0 ? "↑" : "↓"} {Math.abs(data.kpis.satisfaccion.delta).toFixed(1)} vs anterior
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-[var(--text-muted)]">sin comparativa</p>
                        )}
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{data.kpis.satisfaccion.n} opiniones</p>
                      </div>
                      {data.satisfaccion_tendencia.length > 1 && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-2">Tendencia semanal</p>
                          <ResponsiveContainer width="100%" height={130}>
                            <LineChart data={data.satisfaccion_tendencia}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E7ECF2" vertical={false} />
                              <XAxis dataKey="semana" tickFormatter={(w: string) => "S" + String(w).split("-")[1]} stroke="#5B6673" fontSize={10} />
                              <YAxis domain={[0, 5]} ticks={[0, 2.5, 5]} stroke="#5B6673" fontSize={10} width={20} />
                              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E7ECF2", borderRadius: 8, color: "#0F1A2A", fontSize: 12 }} />
                              <Line type="monotone" dataKey="promedio" stroke={C.completada} strokeWidth={2.5} dot={{ r: 3, fill: C.completada }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}
                  {data.comentarios_recientes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--text-muted)]/15">
                      <p className="text-xs text-[var(--text-muted)] mb-2">Comentarios recientes</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.comentarios_recientes.map((cm, i) => (
                          <div key={i} className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm" style={{ color: "#EF9F27" }}>{"★".repeat(cm.estrellas)}<span style={{ color: "var(--text-muted)", opacity: 0.4 }}>{"★".repeat(5 - cm.estrellas)}</span></span>
                              <span className="text-xs text-[var(--text-muted)]">{cm.servicio}</span>
                            </div>
                            <p className="text-sm italic text-[var(--white)]">"{cm.comentario}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ChartCard>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{label}</span>;
}

function KpiCard({ label, value, suffix = "", delta, deltaUnit = "", invert, subtitle, valueColor }: {
  label: string; value: number | null; suffix?: string; delta?: number | null; deltaUnit?: string; invert?: boolean; subtitle?: string; valueColor?: string;
}) {
  const animated = useCountUp(value ?? 0);
  const display = value === null ? "—" : Math.round(animated);
  let deltaEl = null;
  if (delta !== undefined && delta !== null) {
    const mejora = invert ? delta <= 0 : delta >= 0;
    const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
    const extra = invert && delta < 0 ? " mejora" : invert && delta > 0 ? " atención" : "";
    deltaEl = <p className="mt-1 text-sm" style={{ color: mejora ? C.verde : C.rojo }}>{arrow} {Math.abs(delta)}{deltaUnit}{extra} vs anterior</p>;
  } else if (delta === null) {
    deltaEl = <p className="mt-1 text-sm text-[var(--text-muted)]">sin comparativa</p>;
  }
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--text-muted)]/15">
      <p className="font-body text-sm text-[var(--text-muted)]">{label}</p>
      <p className="font-display font-bold text-4xl mt-2" style={{ color: valueColor ?? "var(--white)" }}>{display}{value !== null ? suffix : ""}</p>
      {deltaEl}
      {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--text-muted)]/15">
      <h3 className="font-display text-lg text-[var(--white)] mb-3">{title}</h3>
      {children}
    </div>
  );
}
