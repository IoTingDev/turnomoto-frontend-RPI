import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  PieChart, Pie, Tooltip, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from "recharts";
import { TURNOS_DEMO_MECANICO } from "@/lib/mock-data";
import { useAdminGuard } from "@/hooks/use-admin-guard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Gerencia — Agenda de Taller Suzuki" }] }),
  component: Dashboard,
});

type Periodo = "hoy" | "semana" | "mes";

function useCountUp(target: number, duration = 1500) {
  const [val, setVal] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      setVal(target * eased);
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return val;
}

function Dashboard() {
  useAdminGuard(["gerencia"]);
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>("hoy");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--white)]">
      <header className="px-6 py-5 border-b border-[var(--text-muted)]/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate({ to: "/" })} className="touch-btn h-11 px-4 rounded-lg bg-[var(--bg-tertiary)] text-sm font-display">← Volver al kiosko</button>
          <h1 className="font-display font-bold text-xl md:text-2xl">📊 Dashboard de Gestión — Agenda de Taller Suzuki</h1>
        </div>
        <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
          {(["hoy", "semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`touch-btn h-10 px-4 rounded-md font-display text-sm capitalize ${periodo === p ? "border-b-2 border-[var(--suzuki-red)] bg-[var(--bg-tertiary)]" : "text-[var(--text-muted)]"}`}
            >
              {p === "hoy" ? "Hoy" : p === "semana" ? "Esta semana" : "Este mes"}
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total turnos agendados" target={47} suffix="" delta="↑12%" deltaColor="success" />
          <KpiCard label="Tasa de cumplimiento" target={87} suffix="%" progress={87} />
          <KpiCard label="Tiempo promedio de atención" target={52} suffix=" min" subtitle="meta: 45 min" />
          <KpiCard label="Clientes nuevos" target={8} suffix="" delta="↑3" deltaColor="success" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Turnos por hora del día">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { h: "8:00", v: 5 }, { h: "9:00", v: 8 }, { h: "10:00", v: 12 },
                { h: "11:00", v: 9 }, { h: "12:00", v: 4 }, { h: "14:00", v: 7 },
                { h: "15:00", v: 11 }, { h: "16:00", v: 6 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                <XAxis dataKey="h" stroke="#8C8C8C" />
                <YAxis stroke="#8C8C8C" />
                <Tooltip contentStyle={{ background: "#2D2D2D", border: "1px solid #3A3A3A", color: "#fff" }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                  {[5, 8, 12, 9, 4, 7, 11, 6].map((v, i) => {
                    const max = 12;
                    return <Cell key={i} fill={v === max ? "#CC0000" : "#003399"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Servicios más solicitados">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Cambio de aceite", value: 35 },
                    { name: "Revisión 10.000 km", value: 22 },
                    { name: "Pastillas de freno", value: 18 },
                    { name: "Diagnóstico", value: 13 },
                    { name: "Ajuste de cadena", value: 8 },
                    { name: "Revisión 20.000 km", value: 4 },
                  ]}
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {["#CC0000", "#003399", "#3B82F6", "#22C55E", "#EAB308", "#8C8C8C"].map((c, i) => (
                    <Cell key={i} fill={c} stroke="#1A1A1A" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#2D2D2D", border: "1px solid #3A3A3A", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Tendencia semanal de turnos">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={[
              { d: "Lun", v: 5 }, { d: "Mar", v: 7 }, { d: "Mié", v: 6 },
              { d: "Jue", v: 8 }, { d: "Vie", v: 9 }, { d: "Sáb", v: 7 }, { d: "Dom", v: 10 },
            ]}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CC0000" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#CC0000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
              <XAxis dataKey="d" stroke="#8C8C8C" />
              <YAxis stroke="#8C8C8C" />
              <Tooltip contentStyle={{ background: "#2D2D2D", border: "1px solid #3A3A3A", color: "#fff" }} />
              <Area type="monotone" dataKey="v" stroke="#CC0000" strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Table */}
        <ChartCard title="Últimos turnos agendados">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--text-muted)]/20">
                  <th className="py-2 px-2 font-display">Hora</th>
                  <th className="py-2 px-2 font-display">N° Turno</th>
                  <th className="py-2 px-2 font-display">Cliente</th>
                  <th className="py-2 px-2 font-display">Moto</th>
                  <th className="py-2 px-2 font-display">Servicio</th>
                  <th className="py-2 px-2 font-display">Estado</th>
                </tr>
              </thead>
              <tbody>
                {TURNOS_DEMO_MECANICO.map((t, i) => {
                  const color = t.estado === "completada" ? "var(--success)" : t.estado === "en_proceso" ? "var(--info)" : "var(--warning)";
                  const label = t.estado === "en_proceso" ? "En proceso" : t.estado === "completada" ? "Completada" : "Pendiente";
                  return (
                    <tr key={i} className="border-b border-[var(--text-muted)]/10">
                      <td className="py-2 px-2 font-display">{t.hora}</td>
                      <td className="py-2 px-2 font-display text-[var(--suzuki-red)]">{t.turno}</td>
                      <td className="py-2 px-2">{t.cliente}</td>
                      <td className="py-2 px-2 text-[var(--text-muted)]">{t.moto} · {t.placa}</td>
                      <td className="py-2 px-2">{t.servicio}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 rounded-full text-xs border" style={{ borderColor: color, color }}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </main>
    </div>
  );
}

function KpiCard({ label, target, suffix, delta, deltaColor, subtitle, progress }: { label: string; target: number; suffix?: string; delta?: string; deltaColor?: "success"; subtitle?: string; progress?: number }) {
  const v = useCountUp(target);
  const display = Math.round(v);
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--text-muted)]/15">
      <p className="font-body text-sm text-[var(--text-muted)]">{label}</p>
      <p className="font-display font-bold text-4xl mt-2 text-[var(--white)]">
        {display}{suffix}
      </p>
      {delta && <p className={`mt-1 text-sm ${deltaColor === "success" ? "text-[var(--success)]" : ""}`}>{delta} vs periodo anterior</p>}
      {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>}
      {progress !== undefined && (
        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] mt-3 overflow-hidden">
          <div className="h-full bg-[var(--suzuki-red)] transition-all duration-1000" style={{ width: `${Math.min(100, v)}%` }} />
        </div>
      )}
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
