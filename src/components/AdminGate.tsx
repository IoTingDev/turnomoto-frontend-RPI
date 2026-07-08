import { useRef, useState } from "react";
import { PinModal } from "./PinModal";

const LONG_PRESS_MS = 5000;

export function AdminGate() {
  const [showModal, setShowModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    timerRef.current = setTimeout(() => setShowModal(true), LONG_PRESS_MS);
  };

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 w-20 h-20 z-40"
        style={{ background: "transparent", touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        onTouchStart={start}
        onTouchEnd={cancel}
        onTouchMove={cancel}
        onMouseDown={start}
        onMouseUp={cancel}
        onMouseLeave={cancel}
        aria-hidden="true"
      />
      {showModal && <PinModal onClose={() => setShowModal(false)} />}
    </>
  );
}
