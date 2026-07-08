import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useIdleTimeout, IdleOverlay } from "@/lib/use-idle-timeout";
import { actualizarCliente, actualizarMoto, ApiError } from "@/lib/api-client";
import { MODELOS_SUZUKI, type Moto } from "@/lib/mock-data";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Mis datos — Agenda Suzuki" }] }),
  component: Perfil,
});

const PLACA_MOTO_REGEX = /^[A-Z]{3}\d{2}[A-Z]$/;

function Perfil() {
  const navigate = useNavigate();
  const { currentClient, selectedMoto, setClient } = useAppStore();
  const { warningRef, countdownRef } = useIdleTimeout();

  const initialModeloInList = (() => {
    if (!selectedMoto) return false;
    return Object.values(MODELOS_SUZUKI).some((arr) => arr.includes(selectedMoto.modelo));
  })();

  const [data, setData] = useState({
    nombre: currentClient?.nombre ?? "",
    telefono: currentClient?.telefono ?? "",
    email: currentClient?.email ?? "",
    placa: selectedMoto?.placa ?? "",
    modelo: initialModeloInList ? (selectedMoto?.modelo ?? "") : "Otro",
    modeloOtro: initialModeloInList ? "" : (selectedMoto?.modelo ?? ""),
    anio: String(selectedMoto?.anio ?? ""),
    color: selectedMoto?.color ?? "",
    kilometraje: String(selectedMoto?.kilometraje ?? 0),
  });
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!currentClient || !selectedMoto) {
    return (
      <div className="bg-carbon min-h-screen flex items-center justify-center">
        <button
          onClick={() => navigate({ to: "/" })}
          className="touch-btn h-14 px-6 rounded-lg bg-[var(--suzuki-blue)] text-[var(--white)] font-display"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.nombre.trim()) e.nombre = "Campo requerido";
    if (!/^3\d{9}$/.test(data.telefono)) e.telefono = "10 dígitos, empieza por 3";
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) e.email = "Email inválido";
    if (!PLACA_MOTO_REGEX.test(data.placa)) e.placa = "Formato de placa de moto inválido. Debe ser AAA00A (ej: ABC12D)";
    if (!data.modelo) e.modelo = "Seleccione un modelo";
    if (data.modelo === "Otro" && !data.modeloOtro.trim()) e.modeloOtro = "Escriba el modelo";
    const y = parseInt(data.anio);
    if (!y || y < 2000 || y > 2026) e.anio = "Año entre 2000 y 2026";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");
    try {
      const modeloFinal = data.modelo === "Otro" ? data.modeloOtro : data.modelo;
      const placaUpper = data.placa.toUpperCase();
      const anioNum = parseInt(data.anio);
      const kmNum = parseInt(data.kilometraje || "0");
      const emailNorm = data.email || null;

      const clientePatch: { nombre?: string; telefono?: string; email?: string | null } = {};
      if (data.nombre !== currentClient.nombre) clientePatch.nombre = data.nombre;
      if (data.telefono !== currentClient.telefono) clientePatch.telefono = data.telefono;
      if (emailNorm !== currentClient.email) clientePatch.email = emailNorm;

      const motoPatch: { placa?: string; modelo?: string; anio?: number; color?: string | null; kilometraje?: number } = {};
      if (placaUpper !== selectedMoto.placa) motoPatch.placa = placaUpper;
      if (modeloFinal !== selectedMoto.modelo) motoPatch.modelo = modeloFinal;
      if (anioNum !== selectedMoto.anio) motoPatch.anio = anioNum;
      if (data.color !== selectedMoto.color) motoPatch.color = data.color || null;
      if (kmNum !== selectedMoto.kilometraje) motoPatch.kilometraje = kmNum;

      if (Object.keys(clientePatch).length === 0 && Object.keys(motoPatch).length === 0) {
        navigate({ to: "/servicios" });
        return;
      }

      let updatedNombre = currentClient.nombre;
      let updatedTelefono = currentClient.telefono;
      let updatedEmail = currentClient.email;
      let updatedMoto: Moto = selectedMoto;

      if (Object.keys(clientePatch).length > 0) {
        const res = await actualizarCliente(currentClient.id, clientePatch);
        updatedNombre = res.nombre;
        updatedTelefono = res.telefono;
        updatedEmail = res.email;
        console.log("[PERFIL] cliente actualizado:", res);
      }

      if (Object.keys(motoPatch).length > 0) {
        const res = await actualizarMoto(selectedMoto.id, motoPatch);
        updatedMoto = {
          ...selectedMoto,
          placa: res.placa,
          modelo: res.modelo,
          anio: res.anio,
          color: res.color ?? "",
          kilometraje: res.kilometraje ?? 0,
        };
        console.log("[PERFIL] moto actualizada:", res);
      }

      const newClient = {
        ...currentClient,
        nombre: updatedNombre,
        telefono: updatedTelefono,
        email: updatedEmail,
        motos: currentClient.motos.map((m) => (m.id === updatedMoto.id ? updatedMoto : m)),
      };
      setClient(newClient);
      navigate({ to: "/servicios" });
    } catch (err) {
      console.error("[PERFIL] error:", err);
      if (err instanceof ApiError) {
        setApiError(err.status === 0 ? "No hay conexión con el servidor." : err.message);
      } else {
        setApiError("Error desconocido al guardar los cambios.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-carbon min-h-screen flex flex-col animate-slide-in">
      <div className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--text-muted)]/20 shrink-0">
        <button
          onClick={() => navigate({ to: "/servicios" })}
          className="touch-btn min-w-[80px] h-12 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-display"
        >
          ← Volver
        </button>
        <h2 className="font-display text-lg md:text-xl text-[var(--white)]">Editar mis datos</h2>
        <span className="min-w-[80px]" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
        <h3 className="font-display text-xl text-[var(--white)] mb-4">Datos personales</h3>

        <Field label="Número de documento" locked>
          <input
            value={currentClient.documento}
            disabled
            className="w-full h-14 px-4 rounded-lg bg-[var(--bg-secondary)]/50 text-[var(--text-muted)] text-base font-body border-2 border-transparent cursor-not-allowed"
          />
          <span className="block text-[var(--text-muted)] text-xs mt-1">
            🔒 El número de documento es un identificador legal y no se puede editar
          </span>
        </Field>

        <Field label="Nombre completo" required error={errors.nombre}>
          <input value={data.nombre} onChange={(e) => setData({ ...data, nombre: e.target.value })} className={inputCls(errors.nombre)} />
        </Field>

        <Field label="Número de celular" required error={errors.telefono}>
          <input inputMode="numeric" maxLength={10} value={data.telefono} onChange={(e) => setData({ ...data, telefono: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.telefono)} />
        </Field>

        <Field label="Correo electrónico" error={errors.email}>
          <input inputMode="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} className={inputCls(errors.email)} />
        </Field>

        <h3 className="font-display text-xl text-[var(--white)] mb-4 mt-8">Datos de mi moto</h3>

        <Field label="Placa" required error={errors.placa} hint="Formato de moto: 3 letras + 2 números + 1 letra (ej: ABC12D)">
          <input
            maxLength={6}
            value={data.placa}
            onChange={(e) => setData({ ...data, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
            className={inputCls(errors.placa)}
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
          <input inputMode="numeric" maxLength={4} value={data.anio} onChange={(e) => setData({ ...data, anio: e.target.value.replace(/\D/g, "") })} className={inputCls(errors.anio)} />
        </Field>

        <Field label="Color">
          <input value={data.color} onChange={(e) => setData({ ...data, color: e.target.value })} className={inputCls()} />
        </Field>

        <Field label="Kilometraje aproximado">
          <input inputMode="numeric" value={data.kilometraje} onChange={(e) => setData({ ...data, kilometraje: e.target.value.replace(/\D/g, "") })} className={inputCls()} />
        </Field>

        {apiError && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--suzuki-red)]/15 border border-[var(--suzuki-red)]/40">
            <p className="font-body text-sm text-[var(--white)]">⚠️ {apiError}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6 pb-8">
          <button
            onClick={() => navigate({ to: "/servicios" })}
            disabled={submitting}
            className="touch-btn flex-1 h-14 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] font-display text-base disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="touch-btn flex-[2] h-14 rounded-lg bg-[var(--suzuki-red)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-[var(--white)] font-display text-lg flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios ✓"
            )}
          </button>
        </div>
      </div>

      <IdleOverlay warningRef={warningRef} countdownRef={countdownRef} />
    </div>
  );
}

function Field({ label, required, locked, error, children, hint }: { label: string; required?: boolean; locked?: boolean; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-4">
      <span className="block font-body text-sm text-[var(--white)]/90 mb-2">
        {label}
        {required && <span className="text-[var(--suzuki-red)]"> ✱</span>}
        {locked && <span className="text-[var(--text-muted)]"> 🔒</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[var(--text-muted)] text-xs mt-1">{hint}</span>}
      {error && <span className="block text-[var(--suzuki-red)] text-xs mt-1">{error}</span>}
    </label>
  );
}

const inputCls = (err?: string) =>
  `w-full h-14 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-base font-body outline-none border-2 ${err ? "border-[var(--suzuki-red)]/60" : "border-transparent focus:border-[var(--suzuki-blue)]"}`;
