"use server";

import { revalidatePath } from "next/cache";
import type {
  CategoriaProducto,
  Rol,
  TipoIdentificacion,
  TipoPersona,
  TipoProducto,
} from "@/domain/tipos";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import type { NuevoCliente, NuevoProducto } from "@/lib/datos/repositorio";
import { esRol } from "@/lib/roles";
import { obtenerClienteWorldOffice } from "@/worldoffice";

export interface EstadoFormUsuario {
  error?: string;
  ok?: string;
}

/** Estado genérico de un formulario del admin. */
export interface EstadoForm {
  error?: string;
  ok?: string;
}

// --- Helpers de lectura de FormData ------------------------------------------
/** Texto obligatorio (recortado). */
const req = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** Texto opcional: null si viene vacío. */
const txt = (fd: FormData, k: string) => req(fd, k) || null;
/** Número opcional: null si viene vacío. */
const num = (fd: FormData, k: string) => {
  const v = req(fd, k);
  return v ? Number(v) : null;
};
/** Checkbox: true si viene marcado. */
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

/** Crea un vendedor o contable (solo el administrador). */
export async function crearUsuarioAccion(
  _previo: EstadoFormUsuario,
  formData: FormData,
): Promise<EstadoFormUsuario> {
  await requerirRol("administrador");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rol = String(formData.get("rol") ?? "");
  const clave = String(formData.get("clave") ?? "");

  if (!nombre || !email || !clave) {
    return { error: "Completa nombre, correo y contraseña." };
  }
  if (!esRol(rol) || rol === "administrador") {
    return { error: "El rol debe ser vendedor o contable." };
  }

  try {
    await obtenerRepositorio().crearUsuario({ nombre, email, rol: rol as Rol, clave });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el usuario." };
  }

  revalidatePath("/admin");
  return { ok: `Usuario ${nombre} creado.` };
}

/** Elimina un usuario por id. */
export async function eliminarUsuarioAccion(id: string): Promise<void> {
  await requerirRol("administrador");
  await obtenerRepositorio().eliminarUsuario(id);
  revalidatePath("/admin");
}

/** Actualiza el stock de un producto (gestión de inventario). */
export async function actualizarStockAccion(
  productoId: string,
  stock: number,
): Promise<void> {
  await requerirRol("administrador");
  await obtenerRepositorio().actualizarStock(productoId, Math.max(0, stock));
  revalidatePath("/admin");
}

/** Crea un cliente (tercero) y, si está en modo live, también en World Office. */
export async function crearClienteAccion(
  _previo: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await requerirRol("administrador");

  const nombre = req(fd, "nombre");
  const nit = req(fd, "nit");
  if (!nombre || !nit) {
    return { error: "El nombre/razón social y el número de identificación son obligatorios." };
  }

  const datos: NuevoCliente = {
    nombre,
    nit,
    email: txt(fd, "email"),
    descuentoPct: num(fd, "descuentoPct") ?? 0,
    tipoIdentificacion: (req(fd, "tipoIdentificacion") as TipoIdentificacion) || "NIT",
    digitoVerificacion: txt(fd, "digitoVerificacion"),
    tipoPersona: (req(fd, "tipoPersona") as TipoPersona) || "juridica",
    primerNombre: txt(fd, "primerNombre"),
    segundoNombre: txt(fd, "segundoNombre"),
    primerApellido: txt(fd, "primerApellido"),
    segundoApellido: txt(fd, "segundoApellido"),
    telefono: txt(fd, "telefono"),
    direccion: txt(fd, "direccion"),
    ciudad: txt(fd, "ciudad"),
    esCliente: bool(fd, "esCliente"),
    esProveedor: bool(fd, "esProveedor"),
    clasificacion: txt(fd, "clasificacion"),
    zona: txt(fd, "zona"),
    plazoDias: num(fd, "plazoDias"),
    cupoCredito: num(fd, "cupoCredito"),
    listaPrecios: txt(fd, "listaPrecios"),
    tipoContribuyente: txt(fd, "tipoContribuyente"),
    clasificacionDian: txt(fd, "clasificacionDian"),
    responsabilidadesFiscales: txt(fd, "responsabilidadesFiscales"),
    activo: fd.get("activo") == null ? true : bool(fd, "activo"),
  };

  let cliente;
  try {
    cliente = await obtenerRepositorio().crearCliente(datos);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el cliente." };
  }

  // Reflejo en World Office (simulado en mock; real en live). No bloquea.
  let avisoWO = "";
  try {
    const r = await obtenerClienteWorldOffice().crearTercero(cliente);
    if (!r.ok) avisoWO = ` (aviso World Office: ${r.mensaje})`;
  } catch {
    avisoWO = " (aviso: no se pudo reflejar en World Office; quedó guardado)";
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/vendedor");
  return { ok: `Cliente ${cliente.nombre} creado.${avisoWO}` };
}

/** Crea un producto (inventario) y, si está en modo live, también en World Office. */
export async function crearProductoAccion(
  _previo: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await requerirRol("administrador");

  const codigo = req(fd, "codigo");
  const descripcion = req(fd, "descripcion");
  const categoria = req(fd, "categoria") as CategoriaProducto;
  if (!codigo || !descripcion) {
    return { error: "El código y la descripción son obligatorios." };
  }

  const datos: NuevoProducto = {
    codigo,
    descripcion,
    categoria,
    marca: req(fd, "marca"),
    unidad: req(fd, "unidad") || "UND",
    precio: num(fd, "precio") ?? 0,
    ivaPct: num(fd, "ivaPct") ?? 0,
    stock: num(fd, "stock") ?? 0,
    activo: fd.get("activo") == null ? true : bool(fd, "activo"),
    grupo: txt(fd, "grupo"),
    tipo: (req(fd, "tipo") as TipoProducto) || "producto",
    manejaInventario: fd.get("manejaInventario") == null ? true : bool(fd, "manejaInventario"),
    cuentaVenta: txt(fd, "cuentaVenta"),
    cuentaCompra: txt(fd, "cuentaCompra"),
  };

  let producto;
  try {
    producto = await obtenerRepositorio().crearProducto(datos);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el producto." };
  }

  let avisoWO = "";
  try {
    const r = await obtenerClienteWorldOffice().crearInventario(producto);
    if (!r.ok) avisoWO = ` (aviso World Office: ${r.mensaje})`;
  } catch {
    avisoWO = " (aviso: no se pudo reflejar en World Office; quedó guardado)";
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/vendedor");
  return { ok: `Producto ${producto.codigo} creado.${avisoWO}` };
}
