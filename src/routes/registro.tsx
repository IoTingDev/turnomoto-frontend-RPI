import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MODELOS_SUZUKI, type ClienteConMotos, type Moto } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Registro — Agenda Suzuki" }] }),
  component: Registro,
});

interface FormData {
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
  placa: string;
  modelo: string;
  modeloOtro: string;
  anio: string;
  color: string;
  kilometraje: string;
}

function Registro() {
  const navigate = useNavigate();
  const setClient = useAppStore((s) => s.setClient);
  const { warningRef, countdownRef } = useIdleTimeout();
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<FormData>({
    nombre: "", documento: "", telefono: "", email: "",
    placa: "", modelo: "", modeloOtro: "", anio: "", color: "", kilometraje: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validateStep1 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.nombre.trim()) e.nombre = "Campo requerido";
    if (!/^\d{6,10}$/.test(data.documento)) e.documento = "6-10 dígitos";
    if (!/^3\d{9}$/.test(data.telefono)) e.telefono = "10 dígitos, empieza por 3";
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) e.email = "Email inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!/^[A-Z0-9]{6}$/i.test(data.placa)) e.placa = "6 caracteres alfanuméricos";
    if (!data.modelo) e.modelo = "Seleccione un modelo";
    if (data.modelo === "Otro" && !data.modeloOtro.trim()) e.modeloOtro = "Escriba el modelo";
    const y = parseInt(data.anio);
    if (!y || y < 2000 || y > 2026) e.anio = "Año entre 2000 y 2026";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validateStep2()) return;
    const modeloFinal = data.modelo === "Otro" ? data.modeloOtro : data.modelo;
    const moto: Moto = {
      id: Date.now(),
      cliente_id: Date.now(),
      placa: data.placa.toUpperCase(),
      marca: "Suzuki",
      modelo: modeloFinal,
      anio: parseInt(data.anio),
      color: data.color,
      kilometraje: parseInt(data.kilometraje || "0"),
    };
    const client: ClienteConMotos = {
      id: Date.now(),
      nombre: data.nombre,
      documento: data.documento,
      telefono: data.telefono,
      email: data.email || null,
      activo: true,
      created_at: new Date().toISOString(),
      motos: [moto],
    };
    setClient(client);
    navigate({ to: "/servicios" });
  };

  return (
    <div className="bg-carbon min-h-screen flex flex-col animate-slide-in">
      <Header
        title="Registro de nuevo cliente"
        step={step}
        onBack={() => step === 1 ? navigate({ to: "/" }) : setStep(1)}
      />
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
        {step === 1 ? (
          <Step1 data={data} setData={setData} errors={errors} onNext={() => validateStep1() && setStep(2)} />
        ) : (
          <Step2 data={data} setData={setData} errors={errors} onSubmit={submit} />
        )}
      </div>
      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}

function Header({ title, step, onBack }: { title: string; step: 1 | 2; onBack: () => void }) {
  return (
    <div className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--text-muted)]/20 shrink-0">
      <button onClick={onBack} className="touch-btn min-w-[80px] h-12 px-3 rounded-lg bg-[var(--bg-tertiary)] text-white text-sm font-display">
        ← Volver
      </button>
      <h2 className="font-display text-lg md:text-xl text-white truncate">{title}</h2>
      <div className="flex items-center gap-2 min-w-[80px] justify-end">
        <span className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-[var(--suzuki-red)]" : "bg-[var(--bg-tertiary)]"}`} />
        <span className="w-6 h-[2px] bg-[var(--text-muted)]/40" />
        <span className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-[var(--suzuki-red)]" : "bg-[var(--bg-tertiary)]"}`} />
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-body text-sm text-white/90 mb-2">
        {label} {required && <span className="text-[var(--suzuki-red)]">✱</span>}
      </span>
      {children}
      {error && <span className="block text-[var(--suzuki-red)] text-xs mt-1">{error}</span>}
    </label>
  );
}

const inputCls = (err?: string) =>
  `w-full h-14 px-4 rounded-lg bg-[var(--bg-tertiary)] text-white text-base font-body outline-none border-2 ${err ? "border-[var(--suzuki-red)]/60" : "border-transparent focus:border-[var(--suzuki-blue)]"}`;

function Step1({ data, setData, errors, onNext }: any) {
  return (
    <div className="animate-slide-in">
      <h3 className="font-display text-xl text-white mb-4">Paso 1 de 2 — Datos personales</h3>
      <Field label="Nombre completo" required error={errors.nombre}>
        <input value={data.nombre} onChange={(e) => setData({ ...data, nombre: e.target.value })} className={inputCls(errors.nombre)} />
      </Field>
      <Field label="Número de documento" required error={errors.documento}>
        <input inputMode="numeric" maxLength={10} value={data.documento} onChange={(e) => setData({ ...data, documento: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.documento)} />
      </Field>
      <Field label="Número de celular" required error={errors.telefono}>
        <input inputMode="numeric" maxLength={10} value={data.telefono} onChange={(e) => setData({ ...data, telefono: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.telefono)} />
      </Field>
      <Field label="Correo electrónico" error={errors.email}>
        <input inputMode="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} className={inputCls(errors.email)} />
      </Field>
      <button onClick={onNext} className="touch-btn w-full h-14 mt-6 rounded-lg bg-[var(--suzuki-blue)] text-white font-display text-lg">
        Siguiente →
      </button>
    </div>
  );
}

function Step2({ data, setData, errors, onSubmit }: any) {
  return (
    <div className="animate-slide-in pb-8">
      <h3 className="font-display text-xl text-white mb-4">Paso 2 de 2 — Datos de la moto</h3>
      <Field label="Placa" required error={errors.placa}>
        <input maxLength={6} value={data.placa} onChange={(e) => setData({ ...data, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className={inputCls(errors.placa)} placeholder="ABC12D" />
      </Field>

      <Field label="Modelo" required error={errors.modelo || errors.modeloOtro}>
        <div className="max-h-[300px] overflow-y-auto rounded-lg bg-[var(--bg-secondary)]/40 p-3 border border-[var(--text-muted)]/20">
          {Object.entries(MODELOS_SUZUKI).map(([cat, mods]) => (
            <div key={cat} className="mb-3">
              <h4 className="font-display text-xs tracking-widest text-[var(--text-muted)] mb-2">{cat}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {mods.map((m) => {
                  const sel = data.modelo === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setData({ ...data, modelo: m })}
                      className={`touch-btn min-h-[56px] px-3 py-2 rounded-lg text-sm font-body text-left ${sel ? "bg-[var(--bg-tertiary)] border-2 border-[var(--suzuki-red)]" : "bg-[var(--bg-tertiary)] border-2 border-transparent"}`}
                    >
                      {sel && "✓ "}{m}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {data.modelo === "Otro" && (
          <input
            placeholder="Escriba el modelo"
            value={data.modeloOtro}
            onChange={(e) => setData({ ...data, modeloOtro: e.target.value })}
            className={`${inputCls(errors.modeloOtro)} mt-3`}
          />
        )}
      </Field>

      <Field label="Año" required error={errors.anio}>
        <input inputMode="numeric" maxLength={4} value={data.anio} onChange={(e) => setData({ ...data, anio: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.anio)} placeholder="2024" />
      </Field>
      <Field label="Color">
        <input value={data.color} onChange={(e) => setData({ ...data, color: e.target.value })} className={inputCls()} placeholder="Negro" />
      </Field>
      <Field label="Kilometraje aproximado">
        <input inputMode="numeric" value={data.kilometraje} onChange={(e) => setData({ ...data, kilometraje: e.target.value.replace(/\D/g, "") })} className={inputCls()} placeholder="8500" />
      </Field>

      <button onClick={onSubmit} className="touch-btn w-full h-14 mt-6 rounded-lg bg-[var(--suzuki-red)] text-white font-display text-lg">
        Confirmar registro ✓
      </button>
    </div>
  );
}
