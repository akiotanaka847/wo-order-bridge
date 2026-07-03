"use server";

import { revalidatePath } from "next/cache";
import type { Orden, Producto } from "@/domain/tipos";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { obtenerNotificador } from "@/lib/notificaciones";
import { obtenerClienteWorldOffice } from "@/worldoffice";

/** Busca productos por descripción o código (lo llama el buscador en vivo). */
export async function buscarProductosAccion(termino: string): Promise<Producto[]> {
  await requerirRol("vendedor");
  return obtenerRepositorio().buscarProductos(termino);
}

/**
 * Consulta la disponibilidad EN VIVO de varios códigos contra World Office.
 * Devuelve un mapa código → disponible. Si World Office falla, devuelve un mapa
 * vacío y el buscador cae al stock almacenado (no rompe la búsqueda).
 */
export async function consultarDisponibilidadAccion(
  codigos: string[],
): Promise<Record<string, number>> {
  await requerirRol("vendedor");
  if (codigos.length === 0) return {};
  try {
    const inventario = await obtenerClienteWorldOffice().consultarInventario(
      codigos,
    );
    return Object.fromEntries(inventario.map((i) => [i.codigo, i.disponible]));
  } catch (e) {
    console.error("No se pudo consultar inventario en vivo:", e);
    return {};
  }
}

export interface DatosNuevaOrden {
  clienteId: string;
  estado: "cotizacion" | "pedido";
  lineas: Array<{ productoId: string; cantidad: number; descuentoPct?: number }>;
}

export interface ResultadoCrearOrden {
  ok: boolean;
  mensaje: string;
  consecutivo?: string;
}

/**
 * Convierte una orden en PEDIDO: la crea en tiempo real en World Office (paso 4
 * del flujo del concurso), guarda el id del documento para trazabilidad y avisa
 * al área contable por correo. Compartido por crear, editar y convertir para no
 * duplicar la integración ni la notificación.
 */
async function finalizarComoPedido(orden: Orden): Promise<ResultadoCrearOrden> {
  const repo = obtenerRepositorio();

  const worldOffice = obtenerClienteWorldOffice();
  const resultadoWO = await worldOffice.crearPedido(orden);

  // Pasa a "pedido" (el consecutivo COT- se vuelve PED-) y guarda el doc de WO.
  const actualizada = await repo.cambiarEstadoOrden(
    orden.id,
    "pedido",
    resultadoWO.ok && resultadoWO.documentoId
      ? resultadoWO.documentoId
      : undefined,
  );

  // Avisa al área contable por correo. No bloquea la respuesta al vendedor si
  // el correo falla: se registra y se continúa.
  try {
    await obtenerNotificador().notificarPedidoNuevo(actualizada);
  } catch (e) {
    console.error("No se pudo notificar al área contable:", e);
  }

  revalidatePath("/vendedor");
  revalidatePath("/vendedor/historial");

  // Si World Office falló, el pedido queda guardado igual (reintentable por
  // idempotencia); se avisa al vendedor sin perder la orden.
  if (!resultadoWO.ok) {
    return {
      ok: true,
      consecutivo: actualizada.consecutivo,
      mensaje: `Pedido ${actualizada.consecutivo} guardado y notificado. Aviso: no se pudo crear en World Office (${resultadoWO.mensaje}). Se reintentará.`,
    };
  }

  return {
    ok: true,
    consecutivo: actualizada.consecutivo,
    mensaje: `Pedido ${actualizada.consecutivo} generado en World Office y enviado al área contable.`,
  };
}

/**
 * Crea la orden (cotización o pedido) a nombre del vendedor en sesión.
 * El vendedorId se toma de la sesión, nunca del cliente, por seguridad.
 */
export async function crearOrdenAccion(
  datos: DatosNuevaOrden,
): Promise<ResultadoCrearOrden> {
  const vendedor = await requerirRol("vendedor");

  if (!datos.clienteId) return { ok: false, mensaje: "Selecciona un cliente." };
  if (datos.lineas.length === 0)
    return { ok: false, mensaje: "Agrega al menos un producto." };

  const orden = await obtenerRepositorio().crearOrden({
    vendedorId: vendedor.id,
    clienteId: datos.clienteId,
    estado: datos.estado,
    lineas: datos.lineas,
  });

  // Una cotización solo se guarda; no toca World Office.
  if (orden.estado !== "pedido") {
    revalidatePath("/vendedor");
    return {
      ok: true,
      consecutivo: orden.consecutivo,
      mensaje: `Cotización ${orden.consecutivo} guardada.`,
    };
  }

  return finalizarComoPedido(orden);
}

/**
 * Convierte una cotización ya guardada en pedido, desde el historial del
 * vendedor. Verifica que la cotización sea del propio vendedor.
 */
export async function convertirEnPedidoAccion(
  ordenId: string,
): Promise<ResultadoCrearOrden> {
  const vendedor = await requerirRol("vendedor");
  const orden = await obtenerRepositorio().obtenerOrden(ordenId);

  if (!orden) return { ok: false, mensaje: "Orden no encontrada." };
  if (orden.vendedorId !== vendedor.id)
    return { ok: false, mensaje: "No puedes convertir órdenes de otro vendedor." };
  if (orden.estado !== "cotizacion")
    return { ok: false, mensaje: "Solo las cotizaciones se convierten en pedido." };

  return finalizarComoPedido(orden);
}

/**
 * Edita una cotización (cliente y líneas) del propio vendedor. Si `estado` es
 * "pedido", además la convierte en pedido tras guardar los cambios.
 */
export async function editarOrdenAccion(
  ordenId: string,
  datos: DatosNuevaOrden,
): Promise<ResultadoCrearOrden> {
  const vendedor = await requerirRol("vendedor");

  if (!datos.clienteId) return { ok: false, mensaje: "Selecciona un cliente." };
  if (datos.lineas.length === 0)
    return { ok: false, mensaje: "Agrega al menos un producto." };

  const repo = obtenerRepositorio();
  const existente = await repo.obtenerOrden(ordenId);
  if (!existente) return { ok: false, mensaje: "Orden no encontrada." };
  if (existente.vendedorId !== vendedor.id)
    return { ok: false, mensaje: "No puedes editar órdenes de otro vendedor." };
  if (existente.estado !== "cotizacion")
    return { ok: false, mensaje: "Solo se editan cotizaciones." };

  const editada = await repo.editarOrden(ordenId, {
    clienteId: datos.clienteId,
    lineas: datos.lineas,
  });

  // Guardar cambios y generar pedido a la vez, si así lo pidió el vendedor.
  if (datos.estado === "pedido") {
    return finalizarComoPedido(editada);
  }

  revalidatePath("/vendedor/historial");
  return {
    ok: true,
    consecutivo: editada.consecutivo,
    mensaje: `Cotización ${editada.consecutivo} actualizada.`,
  };
}
