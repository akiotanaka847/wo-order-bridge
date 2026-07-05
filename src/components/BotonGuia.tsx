"use client";

import { driver } from "driver.js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Rol } from "@/domain/tipos";
import { tramosGuia } from "@/lib/guia/pasos";
import { IconoAyuda } from "@/components/Iconos";

/**
 * Marca de "ya vio la guía" POR USUARIO (no por rol): un usuario nuevo debe
 * recibir su guía aunque otro del mismo rol ya la haya visto en este navegador.
 */
const claveVista = (usuarioId: string) => `guia-vista:${usuarioId}`;

/** Estado del recorrido en curso: en qué tramo continuar tras navegar. */
const CLAVE_RECORRIDO = "guia-recorrido";

/**
 * Evita el doble arranque en la MISMA sesión de pestaña: el menú lateral se
 * renderiza dos veces (escritorio + cajón móvil) y solo una instancia debe
 * conducir. Se guarda el usuario para que un cambio de sesión (otro usuario
 * entra sin recargar la pestaña) vuelva a permitir el auto-arranque.
 */
let autoLanzadaPara: string | null = null;

/**
 * Espera a que la página pinte alguna ancla de la guía (`data-guia`) antes de
 * arrancar, para no recorrer una vista a medio cargar. Si no aparece, arranca
 * igual: los pasos sin elemento se muestran centrados.
 */
function esperarAnclas(msMax = 4000): Promise<void> {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const intento = () => {
      if (document.querySelector("[data-guia]") || Date.now() - inicio > msMax) {
        resolve();
      } else {
        setTimeout(intento, 100);
      }
    };
    intento();
  });
}

/**
 * Guía interactiva multi-página: recorre TODAS las secciones del panel del rol.
 * Cada tramo corre en su ruta; al pulsar «Siguiente» en el último paso de un
 * tramo, navega a la siguiente sección y continúa allí. Se lanza sola la
 * primera vez que el usuario entra a su panel y queda disponible desde este
 * botón del menú lateral.
 */
export function BotonGuia({
  rol,
  usuarioId,
  alIniciar,
}: {
  rol: Rol;
  /** Id del usuario en sesión: la guía automática es por usuario. */
  usuarioId: string;
  /** Se llama antes de iniciar (ej. cerrar el cajón del menú en móvil). */
  alIniciar?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const tramos = tramosGuia(rol);

  /** Conduce un tramo y, si no es el último, encadena la navegación al próximo. */
  function conducir(indice: number) {
    const tramo = tramos[indice];
    if (!tramo) return;
    const esUltimoTramo = indice === tramos.length - 1;

    // El último paso de un tramo intermedio navega al siguiente en "Siguiente".
    const pasos = tramo.pasos.map((paso, i) => {
      if (esUltimoTramo || i !== tramo.pasos.length - 1) return paso;
      return {
        ...paso,
        popover: {
          ...paso.popover,
          nextBtnText: "Siguiente",
          onNextClick: () => {
            sessionStorage.setItem(
              CLAVE_RECORRIDO,
              JSON.stringify({ rol, tramo: indice + 1 }),
            );
            instancia.destroy();
            router.push(tramos[indice + 1].ruta);
          },
        },
      };
    });

    const instancia = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "¡Listo!",
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "guia-marca",
      steps: pasos,
      onDestroyed: () => localStorage.setItem(claveVista(usuarioId), "1"),
    });
    instancia.drive();
  }

  useEffect(() => {
    // 1) Hay un recorrido en curso y esta es su ruta: continúa aquí.
    const crudo = sessionStorage.getItem(CLAVE_RECORRIDO);
    if (crudo) {
      try {
        const estado = JSON.parse(crudo) as { rol: Rol; tramo: number };
        if (estado.rol === rol && tramos[estado.tramo]?.ruta === pathname) {
          sessionStorage.removeItem(CLAVE_RECORRIDO);
          autoLanzadaPara = usuarioId; // el recorrido ya está en marcha
          void esperarAnclas().then(() => conducir(estado.tramo));
          return;
        }
      } catch {
        sessionStorage.removeItem(CLAVE_RECORRIDO);
      }
    }

    // 2) Primera visita de ESTE USUARIO en este navegador: arranque automático.
    if (pathname !== tramos[0].ruta) return;
    if (autoLanzadaPara === usuarioId) return;
    if (localStorage.getItem(claveVista(usuarioId))) return;

    // La marca de "lanzada" se pone AL ARRANCAR (dentro del temporizador), no
    // antes: React en desarrollo monta/desmonta/monta el componente, y si la
    // marca se pusiera aquí, la limpieza cancelaría el temporizador y el
    // segundo montaje se retiraría sin lanzar nada.
    const temporizador = setTimeout(() => {
      if (autoLanzadaPara === usuarioId) return; // otra instancia ya arrancó
      if (localStorage.getItem(claveVista(usuarioId))) return;
      autoLanzadaPara = usuarioId;
      void esperarAnclas().then(() => conducir(0));
    }, 500);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, rol, usuarioId]);

  function alPulsar() {
    alIniciar?.();
    if (pathname === tramos[0].ruta) {
      conducir(0);
      return;
    }
    // Desde otra vista: va al inicio del recorrido y arranca al llegar.
    sessionStorage.setItem(CLAVE_RECORRIDO, JSON.stringify({ rol, tramo: 0 }));
    router.push(tramos[0].ruta);
  }

  return (
    <button
      type="button"
      onClick={alPulsar}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
    >
      <IconoAyuda className="h-5 w-5" />
      Guía interactiva
    </button>
  );
}
