/**
 * Recorridos de la guía interactiva por rol (driver.js).
 *
 * Cada recorrido se compone de TRAMOS: un tramo vive en una ruta concreta y
 * tiene sus pasos anclados a elementos de esa página (`data-guia`). Al terminar
 * un tramo, la guía navega a la ruta del siguiente y continúa allí — así el
 * usuario visita de verdad cada sección de su panel y conoce TODO lo que puede
 * hacer.
 */

import type { DriveStep } from "driver.js";
import type { Route } from "next";
import type { Rol } from "@/domain/tipos";

/** Un segmento del recorrido: la ruta donde corre y sus pasos. */
export interface TramoGuia {
  ruta: Route;
  pasos: DriveStep[];
}

/**
 * Paso de PORTADA (bienvenida): tarjeta centrada con estilo propio y sin el
 * botón "Anterior", que en el primer paso no hace nada.
 */
function portada(title: string, description: string): DriveStep {
  return {
    popover: {
      title,
      description,
      popoverClass: "guia-marca guia-portada",
      showButtons: ["next", "close"],
    },
  };
}

/** Paso de CIERRE: misma tarjeta destacada, con "Anterior" disponible. */
function cierre(title: string, description: string): DriveStep {
  return {
    popover: {
      title,
      description,
      popoverClass: "guia-marca guia-portada",
    },
  };
}

/** Paso anclado a un elemento de la página. */
function paso(
  ancla: string,
  title: string,
  description: string,
  side: "top" | "bottom" | "left" | "right" = "bottom",
): DriveStep {
  return {
    element: `[data-guia='${ancla}']`,
    popover: { title, description, side },
  };
}

// ---------------------------------------------------------------------------
// VENDEDOR — cotizador → historial → inventario
// ---------------------------------------------------------------------------

const TRAMOS_VENDEDOR: TramoGuia[] = [
  {
    ruta: "/vendedor",
    pasos: [
      portada(
        "¡Bienvenido a tu panel de vendedor! 👋",
        "Aquí armas cotizaciones y generas pedidos que llegan al instante a contabilidad y a World Office. Te llevamos de paseo por todo tu panel.",
      ),
      paso(
        "buscador-productos",
        "Busca productos",
        "Escribe la descripción o el código, en cualquier orden («sello 7 octavos» funciona). Muestra los primeros 10 con su disponibilidad en vivo; escribe más para afinar y agrega con un clic.",
        "right",
      ),
      paso(
        "selector-cliente",
        "Elige el cliente",
        "Al seleccionarlo, su descuento pactado se aplica automáticamente a todas las líneas.",
        "left",
      ),
      paso(
        "area-cotizacion",
        "Arma la cotización",
        "Cada producto agregado aparece aquí: ajusta la cantidad y el descuento por línea, o quítalo. El subtotal, el descuento y el IVA se calculan en vivo con la misma fórmula que usa el sistema al guardar.",
        "left",
      ),
      paso(
        "acciones-cotizacion",
        "Guarda o genera el pedido",
        "«Guardar cotización» deja un borrador editable. «Generar pedido» lo envía a World Office y contabilidad recibe un correo al instante. Sigamos a tu historial →",
        "top",
      ),
    ],
  },
  {
    ruta: "/vendedor/historial",
    pasos: [
      paso(
        "metricas-vendedor",
        "Tus números",
        "Cotizaciones sin convertir, pedidos enviados, facturados y tu total vendido (pedidos + facturas).",
      ),
      paso(
        "historial-ordenes",
        "Tus órdenes",
        "Paginadas de 20 en 20, las más recientes arriba. Sobre una cotización puedes «Editar» (cliente, productos, cantidades) o «Convertir en pedido». Cada orden tiene su «PDF ↗» con la marca para el cliente y su «Estructura WO ↓» para World Office. Ahora, el inventario →",
        "top",
      ),
    ],
  },
  {
    ruta: "/vendedor/inventario",
    pasos: [
      paso(
        "filtros-inventario",
        "Busca y filtra",
        "Encuentra productos por descripción o código (también por palabras) y filtra por categoría.",
      ),
      paso(
        "inventario-vendedor",
        "Consulta el catálogo",
        "Todo el inventario con stock, precio, código y categoría, paginado de 20 en 20 — para consultar mientras cotizas (solo lectura).",
        "top",
      ),
      cierre(
        "¡Eso es todo! ✅",
        "Cuando quieras repasar, pulsa «Guía interactiva» abajo en el menú.",
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// CONTABLE — panel de pedidos → facturados
// ---------------------------------------------------------------------------

const TRAMOS_CONTABLE: TramoGuia[] = [
  {
    ruta: "/contable",
    pasos: [
      portada(
        "¡Bienvenido a tu panel contable! 👋",
        "Aquí llegan los pedidos en tiempo real, listos para convertirse en factura con un clic. Te llevamos de paseo.",
      ),
      paso(
        "metricas-contable",
        "Tu operación de un vistazo",
        "Pedidos pendientes, monto por facturar, y el conteo y monto acumulado de lo ya facturado en World Office.",
      ),
      paso(
        "filtro-vendedor",
        "Filtra por vendedor",
        "Enfócate en los pedidos de una sola persona cuando lo necesites; el filtro se conserva mientras navegas las páginas.",
      ),
      paso(
        "tabla-pedidos",
        "Pedidos en tiempo real",
        "Los más recientes arriba y la lista se actualiza sola (además recibes un correo por cada pedido nuevo). En cada fila tienes: «PDF ↗» imprimible, «Estructura WO ↓» con los datos para World Office y «Convertir a factura», que crea la factura en World Office con un clic.",
        "top",
      ),
      paso(
        "descargar-lote",
        "Estructuras en lote",
        "Descarga en un solo archivo las estructuras World Office de todos los pedidos pendientes. Veamos ahora los facturados →",
      ),
    ],
  },
  {
    ruta: "/contable/facturados",
    pasos: [
      paso(
        "filtro-facturados",
        "También filtrable",
        "El historial de facturados también se filtra por vendedor.",
      ),
      paso(
        "tabla-facturados",
        "Historial de facturados",
        "Los pedidos ya convertidos en factura, paginados de 20 en 20, con su PDF y su estructura World Office para consulta o reimpresión.",
        "top",
      ),
      cierre(
        "¡Eso es todo! ✅",
        "Cuando quieras repasar, pulsa «Guía interactiva» abajo en el menú.",
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// ADMINISTRADOR — resumen → usuarios → clientes → inventario → órdenes → WO
// ---------------------------------------------------------------------------

const TRAMOS_ADMIN: TramoGuia[] = [
  {
    ruta: "/admin",
    pasos: [
      portada(
        "¡Bienvenido, administrador! 👋",
        "Controlas toda la plataforma: usuarios, clientes, inventario, órdenes y la conexión con World Office. Te llevamos de paseo por cada sección.",
      ),
      paso(
        "metricas-admin",
        "Resumen general",
        "Usuarios activos (vendedores y contables), tamaño del catálogo, pedidos por facturar y el total facturado.",
      ),
      paso(
        "grafico-ventas",
        "Ventas del último mes",
        "Las ventas día a día de los últimos 30 días, con el total del periodo. Pasa el mouse por la línea para ver cuánto se vendió cada día.",
      ),
      paso(
        "ventas-y-top",
        "Quién vende y qué se vende",
        "Ventas acumuladas por vendedor y el top 5 de productos más vendidos: de un vistazo sabes dónde está el negocio.",
      ),
      paso(
        "distribuciones",
        "Estado de la operación",
        "Cómo se reparten las órdenes (cotización, pedido, facturado) y el catálogo por categoría.",
      ),
      paso(
        "ordenes-recientes",
        "Órdenes recientes",
        "Lo último que ha pasado en la plataforma; «Ver todas →» abre el listado completo.",
        "top",
      ),
      paso(
        "accesos-rapidos",
        "Atajos",
        "Acceso directo a la gestión de usuarios e inventario. Ahora vamos sección por sección: Usuarios →",
        "top",
      ),
    ],
  },
  {
    ruta: "/admin/usuarios",
    pasos: [
      paso(
        "crear-usuario",
        "Crea los accesos",
        "Vendedores y contables con su contraseña inicial. La plataforma es cerrada: solo entra quien tú crees aquí.",
      ),
      paso(
        "tabla-usuarios",
        "Y adminístralos",
        "Desde la lista puedes eliminar un acceso cuando alguien salga del equipo. Sigamos con Clientes →",
        "top",
      ),
    ],
  },
  {
    ruta: "/admin/clientes",
    pasos: [
      paso(
        "nuevo-cliente",
        "Crea clientes",
        "Con «+ Nuevo cliente» registras terceros con todos los datos de World Office: identificación, contacto, descuento pactado y datos fiscales.",
      ),
      paso(
        "tabla-clientes",
        "Tu cartera de clientes",
        "Con identificación, ciudad, contacto y el descuento pactado que los vendedores aplican al cotizar. Ahora, el Inventario →",
        "top",
      ),
    ],
  },
  {
    ruta: "/admin/inventario",
    pasos: [
      paso(
        "filtros-inventario",
        "Busca y filtra",
        "Encuentra cualquier producto por descripción o código (también por palabras) y filtra por categoría.",
      ),
      paso(
        "nuevo-producto",
        "Crea productos",
        "Con «+ Nuevo producto» agregas ítems con su código contable, clasificación, precio e IVA — los datos que espera World Office.",
      ),
      paso(
        "tabla-inventario",
        "Y ajusta el stock",
        "Cambia el stock de cualquier producto al instante: escribe el número y pulsa «Guardar». Paginado de 20 en 20. Veamos las Órdenes →",
        "top",
      ),
    ],
  },
  {
    ruta: "/admin/ordenes",
    pasos: [
      paso(
        "tabla-ordenes",
        "Toda la operación",
        "Cotizaciones, pedidos y facturas de todos los vendedores, con su estado, su PDF y su estructura World Office. Último paso: el Diagnóstico →",
        "top",
      ),
    ],
  },
  {
    ruta: "/admin/diagnostico",
    pasos: [
      paso(
        "chequeos-wo",
        "Diagnóstico World Office",
        "Verifica en segundos el estado de la conexión: token, IDs de la cuenta y una prueba real contra la API. En demo verás el modo simulado; al pasar a producción, aquí confirmas que todo está listo.",
      ),
      cierre(
        "¡Eso es todo! ✅",
        "Cuando quieras repasar, pulsa «Guía interactiva» abajo en el menú.",
      ),
    ],
  },
];

/** Devuelve el recorrido (tramos) del rol. */
export function tramosGuia(rol: Rol): TramoGuia[] {
  switch (rol) {
    case "vendedor":
      return TRAMOS_VENDEDOR;
    case "contable":
      return TRAMOS_CONTABLE;
    case "administrador":
      return TRAMOS_ADMIN;
  }
}
