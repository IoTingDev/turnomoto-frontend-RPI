import { useEffect } from "react";

/**
 * Fuerza una recarga real si la página fue restaurada desde bfcache
 * (back-forward cache del navegador).
 *
 * Sin esto, al usar el botón "atrás"/"adelante" del navegador, Chrome puede
 * mostrar una "foto congelada" en memoria de una pantalla anterior (con
 * datos, sesión y estado de React tal como estaban en ese momento) sin
 * volver a ejecutar JavaScript. En un kiosko esto es peligroso: alguien
 * podría ver datos de un cliente anterior o quedar en una pantalla admin
 * "fantasma" que ya debería estar cerrada.
 */
export function useBfcacheReload() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
}
