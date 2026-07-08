import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Teclado táctil en pantalla, global y desacoplado.
 *
 * Detecta el <input>/<textarea> enfocado y le inyecta caracteres disparando
 * el evento "input" nativo, de modo que React ejecuta el onChange original
 * del campo (respetando sus transformaciones: .replace, .toUpperCase, etc.).
 *
 * No requiere que los inputs sepan nada del teclado. Se monta una sola vez
 * en __root.tsx y funciona en toda la app.
 *
 * Técnica clave: el setter nativo de HTMLInputElement.prototype.value permite
 * cambiar el valor "por debajo" de React; el evento input con bubbles:true
 * hace que React lo detecte como si el usuario hubiera tecleado.
 */

type Layout = "letras" | "simbolos";

const ROWS_LETRAS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"],
  ["z", "x", "c", "v", "b", "n", "m", "@", "."],
];

const ROWS_SIMBOLOS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "_", "@", ".", ",", ":", ";", "/", "+", "#"],
  ["(", ")", "&", "%", "*", "!", "?", "'", "\""],
];

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function OnScreenKeyboard() {
  const [visible, setVisible] = useState(false);
  const [shift, setShift] = useState(false);
  const [layout, setLayout] = useState<Layout>("letras");
  const targetRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const isEditable = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
    if (el instanceof HTMLInputElement) {
      const t = (el.type || "text").toLowerCase();
      // Excluir tipos no textuales
      if (["checkbox", "radio", "range", "button", "submit", "file", "color"].includes(t)) return false;
    }
    if (el.readOnly || el.disabled) return false;
    // Excluir campos marcados explícitamente para ignorar el teclado (ej: PIN admin)
    if (el.dataset.noOsk !== undefined) return false;
    return true;
  };

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (isEditable(e.target)) {
        targetRef.current = e.target;
        setVisible(true);
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      // Si el foco se va a un elemento que no es input (ej: tecla del teclado),
      // no cerramos inmediatamente — el mousedown de las teclas previene blur.
      const next = e.relatedTarget;
      if (!isEditable(next)) {
        // pequeño delay para permitir que un tap en otra tecla mantenga abierto
        setTimeout(() => {
          if (!isEditable(document.activeElement)) {
            setVisible(false);
            targetRef.current = null;
          }
        }, 100);
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const type = useCallback((char: string) => {
    const el = targetRef.current;
    if (!el) return;
    const c = shift ? char.toUpperCase() : char;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newValue = el.value.slice(0, start) + c + el.value.slice(end);
    setNativeValue(el, newValue);
    // Reposicionar cursor
    requestAnimationFrame(() => {
      const pos = start + c.length;
      try { el.setSelectionRange(pos, pos); } catch { /* algunos input types no lo permiten */ }
      el.focus();
    });
    if (shift) setShift(false);
  }, [shift]);

  const backspace = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    let newValue: string;
    let pos: number;
    if (start !== end) {
      newValue = el.value.slice(0, start) + el.value.slice(end);
      pos = start;
    } else {
      newValue = el.value.slice(0, Math.max(0, start - 1)) + el.value.slice(end);
      pos = Math.max(0, start - 1);
    }
    setNativeValue(el, newValue);
    requestAnimationFrame(() => {
      try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
      el.focus();
    });
  }, []);

  const space = useCallback(() => type(" "), [type]);

  const close = useCallback(() => {
    setVisible(false);
    targetRef.current?.blur();
    targetRef.current = null;
  }, []);

  if (!visible) return null;

  const rows = layout === "letras" ? ROWS_LETRAS : ROWS_SIMBOLOS;

  // preventDefault en mousedown/touchstart evita que el input pierda foco al tocar teclas
  const keyMouseDown = (e: React.MouseEvent | React.TouchEvent) => e.preventDefault();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] bg-[var(--bg-secondary)] border-t-2 border-[var(--suzuki-blue)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] select-none"
      onMouseDown={keyMouseDown}
      onTouchStart={keyMouseDown}
    >
      <div className="max-w-4xl mx-auto p-2 md:p-3 flex flex-col gap-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1.5">
            {row.map((k) => (
              <button
                key={k}
                onClick={() => type(k)}
                className="touch-btn flex-1 max-w-[64px] h-12 md:h-14 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-lg md:text-xl font-body active:scale-95 active:bg-[var(--suzuki-blue)] active:text-white"
              >
                {shift ? k.toUpperCase() : k}
              </button>
            ))}
          </div>
        ))}

        {/* Fila de controles */}
        <div className="flex justify-center gap-1.5">
          <button
            onClick={() => setShift((s) => !s)}
            className={`touch-btn h-12 md:h-14 px-4 rounded-lg text-sm font-display active:scale-95 ${
              shift ? "bg-[var(--suzuki-blue)] text-white" : "bg-[var(--bg-tertiary)] text-[var(--white)]"
            }`}
          >
            ⇧ Mayús
          </button>
          <button
            onClick={() => setLayout((l) => (l === "letras" ? "simbolos" : "letras"))}
            className="touch-btn h-12 md:h-14 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-display active:scale-95"
          >
            {layout === "letras" ? "?123" : "ABC"}
          </button>
          <button
            onClick={space}
            className="touch-btn flex-1 max-w-[340px] h-12 md:h-14 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-sm font-body active:scale-95"
          >
            espacio
          </button>
          <button
            onClick={backspace}
            className="touch-btn h-12 md:h-14 px-4 rounded-lg bg-[var(--bg-tertiary)] text-[var(--white)] text-lg active:scale-95"
          >
            ⌫
          </button>
          <button
            onClick={close}
            className="touch-btn h-12 md:h-14 px-4 rounded-lg bg-[var(--suzuki-red)] text-white text-sm font-display active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
