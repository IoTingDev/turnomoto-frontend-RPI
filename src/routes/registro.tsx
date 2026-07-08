import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MODELOS_SUZUKI, type ClienteConMotos, type Moto } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { crearCliente, ApiError } from "@/lib/api-client";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Registro — Agenda Suzuki" }] }),
  component: Registro,
});

const PLACA_MOTO_REGEX = /^[A-Z]{3}\d{2}[A-Z]$/;

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

type Step = 1 | 2 | 3;

function Registro() {
  const navigate = useNavigate();
  const setClient = useAppStore((s) => s.setClient);
  const currentNfcUid = useAppStore((s) => s.currentNfcUid);
  const { warningRef, countdownRef } = useIdleTimeout();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
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
    if (!PLACA_MOTO_REGEX.test(data.placa)) {
      e.placa = "Formato de placa de moto inválido. Debe ser AAA00A (ej: ABC12D)";
    }
    if (!data.modelo) e.modelo = "Seleccione un modelo";
    if (data.modelo === "Otro" && !data.modeloOtro.trim()) e.modeloOtro = "Escriba el modelo";
    const y = parseInt(data.anio);
    if (!y || y < 2000 || y > 2026) e.anio = "Año entre 2000 y 2026";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      const modeloFinal = data.modelo === "Otro" ? data.modeloOtro : data.modelo;
      const created = await crearCliente({
        nombre: data.nombre,
        documento: data.documento,
        telefono: data.telefono,
        email: data.email || null,
        nfc_uid: currentNfcUid,
        moto: {
          placa: data.placa.toUpperCase(),
          marca: "Suzuki",
          modelo: modeloFinal,
          anio: parseInt(data.anio),
          color: data.color || null,
          kilometraje: parseInt(data.kilometraje || "0"),
        },
      });
      console.log("[CLIENTE] creado:", created);

      const client: ClienteConMotos = {
        id: created.id,
        nombre: created.nombre,
        documento: created.documento,
        telefono: created.telefono,
        email: created.email,
        activo: true,
        created_at: new Date().toISOString(),
        motos: created.motos.map<Moto>((m) => ({
          id: m.id,
          cliente_id: created.id,
          placa: m.placa,
          marca: m.marca,
          modelo: m.modelo,
          anio: m.anio,
          color: m.color ?? "",
          kilometraje: m.kilometraje ?? 0,
        })),
      };

      setClient(client);
      navigate({ to: "/servicios" });
    } catch (err) {
      console.error("[CLIENTE] error:", err);
      if (err instanceof ApiError) {
        setApiError(err.status === 0 ? "No hay conexión con el servidor. Verifique la red e intente de nuevo." : err.message);
      } else {
        setApiError("Error desconocido al registrar el cliente.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-carbon min-h-screen flex flex-col animate-slide-in">
      <Header
        title="Registro de nuevo cliente"
        step={step}
        onBack={() => {
          if (step === 1) navigate({ to: "/" });
          else setStep((step - 1) as Step);
        }}
      />
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
        {step === 1 && (
          <Step1
            data={data} setData={setData} errors={errors}
            onNext={() => validateStep1() && setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            data={data} setData={setData} errors={errors}
            onNext={() => validateStep2() && setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            data={data}
            submitting={submitting}
            apiError={apiError}
            onEditPersonal={() => setStep(1)}
            onEditMoto={() => setStep(2)}
            onConfirm={submit}
          />
        )}
      </div>
      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}

function Header({ title, step, onBack }: { title: string; step: Step; onBack: () => void }) {
  const dot = (n: Step) =>
    `w-3 h-3 rounded-full ${step >= n ? "bg-[var(--suzuki-red)]" : "bg-[var(--bg-tertiary)]"}`;
  const bar = "w-6 h-[2px] bg-[var(--text-muted)]/40";
  return (
    <div className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--text-muted)]/20 shrink-0">
      <button onClick={onBack} className="touch-btn min-w-[80px] h-12 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-display">← Volver</button>
      <h2 className="font-display text-lg md:text-xl text-[var(--white)] truncate">{title}</h2>
      <div className="flex items-center gap-1 min-w-[110px] justify-end">
        <span className={dot(1)} /><span className={bar} />
        <span className={dot(2)} /><span className={bar} />
        <span className={dot(3)} />
      </div>
    </div>
  );
}

function Field({ label, required, error, children, hint }: { label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-4">
      <span className="block font-body text-sm text-[var(--white)]/90 mb-2">
        {label} {required && <span className="text-[var(--suzuki-red)]">✱</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[var(--text-muted)] text-xs mt-1">{hint}</span>}
      {error && <span className="block text-[var(--suzuki-red)] text-xs mt-1">{error}</span>}
    </label>
  );
}

const inputCls = (err?: string) =>
  `w-full h-14 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-base font-body outline-none border-2 ${err ? "border-[var(--suzuki-red)]/60" : "border-transparent focus:border-[var(--suzuki-blue)]"}`;

function Step1({ data, setData, errors, onNext }: any) {
  return (
    <div className="animate-slide-in">
      <h3 className="font-display text-xl text-[var(--white)] mb-4">Paso 1 de 3 — Datos personales</h3>

      <Field label="Nombre completo" required error={errors.nombre}>
        <input value={data.nombre} onChange={(e) => setData({ ...data, nombre: e.target.value })} className={inputCls(errors.nombre)} />
      </Field>

      <Field
        label="Número de documento"
        required
        error={errors.documento}
        hint="📌 Verifíquelo con cuidado — este número no se podrá editar después del registro"
      >
        <input inputMode="numeric" maxLength={10} value={data.documento} onChange={(e) => setData({ ...data, documento: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.documento)} />
      </Field>

      <Field label="Número de celular" required error={errors.telefono}>
        <input inputMode="numeric" maxLength={10} value={data.telefono} onChange={(e) => setData({ ...data, telefono: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.telefono)} />
      </Field>

      <Field label="Correo electrónico" error={errors.email}>
        <input inputMode="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} className={inputCls(errors.email)} />
      </Field>

      <button onClick={onNext} className="touch-btn w-full h-14 mt-6 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display text-lg">
        Siguiente →
      </button>
    </div>
  );
}

function Step2({ data, setData, errors, onNext }: any) {
  return (
    <div className="animate-slide-in pb-8">
      <h3 className="font-display text-xl text-[var(--white)] mb-4">Paso 2 de 3 — Datos de la moto</h3>

      <Field
        label="Placa"
        required
        error={errors.placa}
        hint="Formato de moto: 3 letras + 2 números + 1 letra (ej: ABC12D)"
      >
        <input
          maxLength={6}
          value={data.placa}
          onChange={(e) => setData({ ...data, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          className={inputCls(errors.placa)}
          placeholder="ABC12D"
        />
      </Field>

      <Field label="Modelo" required error={errors.modelo || errors.modeloOtro}>
        <div className="max-h-[300px] overflow-y-auto rounded-lg bg-[var(--bg-secondary)]/40 p-3 border border-[var(--text-muted)]/20">
          {Object.entries(MODELOS_SUZUKI).map(([cat, mods]) => (
            <div key={cat} className="mb-3">
              <h4 className="font-display text-xs tracking-widest text-[var(--text-muted)] mb-2">{cat}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(mods as string[]).map((m) => {
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

      <button onClick={onNext} className="touch-btn w-full h-14 mt-6 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display text-lg">
        Siguiente →
      </button>
    </div>
  );
}

function Step3({ data, submitting, apiError, onEditPersonal, onEditMoto, onConfirm }: any) {
  const modeloFinal = data.modelo === "Otro" ? data.modeloOtro : data.modelo;

  return (
    <div className="animate-slide-in pb-8">
      <h3 className="font-display text-xl text-[var(--white)] mb-2">Paso 3 de 3 — Revisión final</h3>
      <p className="font-body text-sm text-[var(--text-muted)] mb-6">
        Verifique cuidadosamente todos los datos antes de confirmar.
      </p>

      {/* Documento destacado con advertencia */}
      <div className="mb-6 rounded-lg bg-[var(--warning)]/10 border-2 border-[var(--warning)]/50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="font-display text-sm text-[var(--warning)] uppercase tracking-wider mb-1">
              Número de documento
            </p>
            <p className="font-display text-2xl font-bold text-[var(--white)]">{data.documento}</p>
            <p className="font-body text-xs text-[var(--text-muted)] mt-2">
              Este número no se podrá editar después del registro. Si está mal, presione "Editar datos personales" abajo.
            </p>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="mb-4 rounded-lg bg-[var(--bg-secondary)] border-l-4 border-[var(--suzuki-blue)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-base text-[var(--white)]">👤 Datos personales</h4>
          <button onClick={onEditPersonal} className="touch-btn text-xs text-[var(--suzuki-blue)] hover:text-[var(--white)] px-3 py-1 rounded border border-[var(--suzuki-blue)]/40">
            ✏️ Editar
          </button>
        </div>
        <RowInfo label="Nombre" value={data.nombre} />
        <RowInfo label="Celular" value={data.telefono} />
        <RowInfo label="Email" value={data.email || "(no registrado)"} />
      </div>

      {/* Datos moto */}
      <div className="mb-6 rounded-lg bg-[var(--bg-secondary)] border-l-4 border-[var(--suzuki-red)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-base text-[var(--white)]">🏍️ Datos de la moto</h4>
          <button onClick={onEditMoto} className="touch-btn text-xs text-[var(--suzuki-red)] hover:text-[var(--white)] px-3 py-1 rounded border border-[var(--suzuki-red)]/40">
            ✏️ Editar
          </button>
        </div>
        <RowInfo label="Placa" value={data.placa.toUpperCase()} />
        <RowInfo label="Modelo" value={modeloFinal} />
        <RowInfo label="Año" value={data.anio} />
        <RowInfo label="Color" value={data.color || "(no especificado)"} />
        <RowInfo label="Kilometraje" value={data.kilometraje ? `${parseInt(data.kilometraje).toLocaleString("es-CO")} km` : "0 km"} />
      </div>

      {apiError && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
          <p className="font-body text-sm text-[var(--white)]">⚠️ {apiError}</p>
        </div>
      )}

      <p className="text-center font-body text-[var(--white)] mb-4">
        ¿Todos los datos son correctos?
      </p>

      <button
        onClick={onConfirm}
        disabled={submitting}
        className="touch-btn w-full h-14 rounded-lg bg-[var(--suzuki-red)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-[var(--white)] font-display text-lg flex items-center justify-center gap-3"
      >
        {submitting ? (
          <>
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Registrando...
          </>
        ) : (
          "Sí, confirmar y registrar ✓"
        )}
      </button>
    </div>
  );
}

function RowInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[var(--text-muted)]/10 last:border-0">
      <span className="font-body text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <span className="font-body text-sm text-[var(--white)] text-right">{value}</span>
    </div>
  );
}
