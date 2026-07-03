/**
 * Repositorio sobre Supabase/Postgres (producción).
 *
 * Implementa el MISMO contrato `Repositorio` que el modo demo, así que el resto
 * de la app no cambia: solo la fábrica (`index.ts`) elige esta implementación
 * cuando `DATA_MODE=supabase`.
 *
 * Reglas de acceso:
 *   - Lecturas/escrituras de negocio → cliente de SERVIDOR (respeta RLS según el
 *     rol del usuario logueado; ver supabase/migrations/0002_rls.sql).
 *   - Gestión de usuarios (crear/eliminar cuentas de Auth) → cliente ADMIN
 *     (service role), porque toca `auth.users`.
 *
 * Los totales se calculan con `domain/calculos.ts`: la MISMA fórmula del panel
 * del vendedor, para que lo guardado coincida siempre con lo previsualizado.
 */

import "server-only";
import { idDesdeCodigo } from "@/data/catalogo";
import { calcularTotales, construirLinea } from "@/domain/calculos";
import { LIMITE_BUSQUEDA_PRODUCTOS } from "@/lib/texto";
import type {
  Cliente,
  LineaOrden,
  Orden,
  Producto,
  Usuario,
} from "@/domain/tipos";
import { crearClienteAdmin } from "@/lib/supabase/cliente-admin";
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor";
import type {
  EdicionOrden,
  FiltroOrdenes,
  NuevaOrden,
  NuevoCliente,
  NuevoProducto,
  NuevoUsuario,
  Repositorio,
} from "./repositorio";

// --- Filas tal como vienen de la base (snake_case) ---------------------------

interface FilaPerfil {
  id: string;
  email: string;
  nombre: string;
  rol: Usuario["rol"];
  activo: boolean;
  creado_en: string;
}

interface FilaCliente {
  id: string;
  nombre: string;
  nit: string;
  email: string | null;
  descuento_pct: number;
  creado_en: string;
  tipo_identificacion?: string;
  digito_verificacion?: string | null;
  tipo_persona?: string;
  primer_nombre?: string | null;
  segundo_nombre?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  es_cliente?: boolean;
  es_proveedor?: boolean;
  clasificacion?: string | null;
  zona?: string | null;
  plazo_dias?: number | null;
  cupo_credito?: number | null;
  lista_precios?: string | null;
  tipo_contribuyente?: string | null;
  clasificacion_dian?: string | null;
  responsabilidades_fiscales?: string | null;
  activo?: boolean;
}

interface FilaProducto {
  id: string;
  codigo: string;
  descripcion: string;
  categoria: Producto["categoria"];
  marca: string;
  unidad: string;
  precio: number;
  iva_pct: number;
  stock: number;
  activo: boolean;
  grupo?: string | null;
  tipo?: Producto["tipo"];
  maneja_inventario?: boolean;
  cuenta_venta?: string | null;
  cuenta_compra?: string | null;
}

interface FilaLinea {
  id: string;
  producto_id: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_pct: number;
  iva_pct: number;
  total_linea: number;
}

interface FilaOrden {
  id: string;
  consecutivo: string;
  estado: Orden["estado"];
  vendedor_id: string;
  cliente_id: string;
  subtotal: number;
  descuento_total: number;
  iva: number;
  total: number;
  world_office_doc_id: string | null;
  creada_en: string;
  actualizada_en: string;
  // Relaciones expandidas en el select.
  vendedor?: { nombre: string } | null;
  cliente?: { nombre: string; nit: string } | null;
  orden_lineas?: FilaLinea[];
}

// --- Mapeos fila → entidad de dominio ----------------------------------------

function aUsuario(f: FilaPerfil): Usuario {
  return {
    id: f.id,
    email: f.email,
    nombre: f.nombre,
    rol: f.rol,
    activo: f.activo,
    creadoEn: f.creado_en,
  };
}

function aCliente(f: FilaCliente): Cliente {
  return {
    id: f.id,
    nombre: f.nombre,
    nit: f.nit,
    email: f.email,
    descuentoPct: Number(f.descuento_pct),
    creadoEn: f.creado_en,
    tipoIdentificacion: f.tipo_identificacion as Cliente["tipoIdentificacion"],
    digitoVerificacion: f.digito_verificacion ?? null,
    tipoPersona: f.tipo_persona as Cliente["tipoPersona"],
    primerNombre: f.primer_nombre ?? null,
    segundoNombre: f.segundo_nombre ?? null,
    primerApellido: f.primer_apellido ?? null,
    segundoApellido: f.segundo_apellido ?? null,
    telefono: f.telefono ?? null,
    direccion: f.direccion ?? null,
    ciudad: f.ciudad ?? null,
    esCliente: f.es_cliente,
    esProveedor: f.es_proveedor,
    clasificacion: f.clasificacion ?? null,
    zona: f.zona ?? null,
    plazoDias: f.plazo_dias ?? null,
    cupoCredito: f.cupo_credito != null ? Number(f.cupo_credito) : null,
    listaPrecios: f.lista_precios ?? null,
    tipoContribuyente: f.tipo_contribuyente ?? null,
    clasificacionDian: f.clasificacion_dian ?? null,
    responsabilidadesFiscales: f.responsabilidades_fiscales ?? null,
    activo: f.activo,
  };
}

function aProducto(f: FilaProducto): Producto {
  return {
    id: f.id,
    codigo: f.codigo,
    descripcion: f.descripcion,
    categoria: f.categoria,
    marca: f.marca,
    unidad: f.unidad,
    precio: Number(f.precio),
    ivaPct: Number(f.iva_pct),
    stock: Number(f.stock),
    activo: f.activo,
    grupo: f.grupo ?? null,
    tipo: f.tipo,
    manejaInventario: f.maneja_inventario,
    cuentaVenta: f.cuenta_venta ?? null,
    cuentaCompra: f.cuenta_compra ?? null,
  };
}

function aLinea(f: FilaLinea): LineaOrden {
  return {
    id: f.id,
    productoId: f.producto_id,
    codigo: f.codigo,
    descripcion: f.descripcion,
    cantidad: Number(f.cantidad),
    precioUnitario: Number(f.precio_unitario),
    descuentoPct: Number(f.descuento_pct),
    ivaPct: Number(f.iva_pct),
    totalLinea: Number(f.total_linea),
  };
}

function aOrden(f: FilaOrden): Orden {
  return {
    id: f.id,
    consecutivo: f.consecutivo,
    estado: f.estado,
    vendedorId: f.vendedor_id,
    vendedorNombre: f.vendedor?.nombre ?? "",
    clienteId: f.cliente_id,
    clienteNombre: f.cliente?.nombre ?? "",
    clienteNit: f.cliente?.nit ?? "",
    lineas: (f.orden_lineas ?? []).map(aLinea),
    subtotal: Number(f.subtotal),
    descuentoTotal: Number(f.descuento_total),
    iva: Number(f.iva),
    total: Number(f.total),
    worldOfficeDocId: f.world_office_doc_id,
    creadaEn: f.creada_en,
    actualizadaEn: f.actualizada_en,
  };
}

/** Select de orden con vendedor, cliente y líneas en una sola consulta. */
const SELECT_ORDEN =
  "*, vendedor:perfiles!ordenes_vendedor_id_fkey(nombre), cliente:clientes!ordenes_cliente_id_fkey(nombre, nit), orden_lineas(*)";

export class RepositorioSupabase implements Repositorio {
  // --- Productos ------------------------------------------------------------
  async buscarProductos(termino: string): Promise<Producto[]> {
    const sb = await crearClienteServidor();
    let consulta = sb.from("productos").select("*").eq("activo", true);

    // Coincidencia por palabras (Y): cada token debe estar en la descripción o
    // en el código. Encadenar .or() por token los combina con AND, así "ssd 256"
    // encuentra "SSD Patriot 256". Se saca lo que rompe la sintaxis de or().
    const tokens = termino
      .trim()
      .split(/\s+/)
      .map((tk) => tk.replace(/[,()]/g, ""))
      .filter(Boolean);
    for (const token of tokens) {
      consulta = consulta.or(`descripcion.ilike.%${token}%,codigo.ilike.%${token}%`);
    }

    const { data, error } = await consulta
      .order("descripcion")
      .limit(LIMITE_BUSQUEDA_PRODUCTOS);
    if (error) throw new Error(error.message);
    return (data as FilaProducto[]).map(aProducto);
  }

  async obtenerProducto(id: string): Promise<Producto | null> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb
      .from("productos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? aProducto(data as FilaProducto) : null;
  }

  async listarProductos(): Promise<Producto[]> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb
      .from("productos")
      .select("*")
      .order("codigo");
    if (error) throw new Error(error.message);
    return (data as FilaProducto[]).map(aProducto);
  }

  async actualizarStock(productoId: string, stock: number): Promise<void> {
    const sb = await crearClienteServidor();
    const { error } = await sb
      .from("productos")
      .update({ stock })
      .eq("id", productoId);
    if (error) throw new Error(error.message);
  }

  async crearProducto(datos: NuevoProducto): Promise<Producto> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb
      .from("productos")
      .insert({
        id: idDesdeCodigo(datos.codigo),
        codigo: datos.codigo,
        descripcion: datos.descripcion,
        categoria: datos.categoria,
        marca: datos.marca,
        unidad: datos.unidad,
        precio: datos.precio,
        iva_pct: datos.ivaPct,
        stock: datos.stock,
        activo: datos.activo,
        grupo: datos.grupo,
        tipo: datos.tipo,
        maneja_inventario: datos.manejaInventario,
        cuenta_venta: datos.cuentaVenta,
        cuenta_compra: datos.cuentaCompra,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return aProducto(data as FilaProducto);
  }

  // --- Clientes -------------------------------------------------------------
  async listarClientes(): Promise<Cliente[]> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb.from("clientes").select("*").order("nombre");
    if (error) throw new Error(error.message);
    return (data as FilaCliente[]).map(aCliente);
  }

  async obtenerCliente(id: string): Promise<Cliente | null> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb
      .from("clientes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? aCliente(data as FilaCliente) : null;
  }

  async crearCliente(datos: NuevoCliente): Promise<Cliente> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb
      .from("clientes")
      .insert({
        nombre: datos.nombre,
        nit: datos.nit,
        email: datos.email,
        descuento_pct: datos.descuentoPct,
        tipo_identificacion: datos.tipoIdentificacion,
        digito_verificacion: datos.digitoVerificacion,
        tipo_persona: datos.tipoPersona,
        primer_nombre: datos.primerNombre,
        segundo_nombre: datos.segundoNombre,
        primer_apellido: datos.primerApellido,
        segundo_apellido: datos.segundoApellido,
        telefono: datos.telefono,
        direccion: datos.direccion,
        ciudad: datos.ciudad,
        es_cliente: datos.esCliente,
        es_proveedor: datos.esProveedor,
        clasificacion: datos.clasificacion,
        zona: datos.zona,
        plazo_dias: datos.plazoDias,
        cupo_credito: datos.cupoCredito,
        lista_precios: datos.listaPrecios,
        tipo_contribuyente: datos.tipoContribuyente,
        clasificacion_dian: datos.clasificacionDian,
        responsabilidades_fiscales: datos.responsabilidadesFiscales,
        activo: datos.activo,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return aCliente(data as FilaCliente);
  }

  // --- Órdenes --------------------------------------------------------------

  /**
   * Construye las líneas (snapshot del producto + descuento del cliente).
   * Compartido por crearOrden y editarOrden para no duplicar el armado.
   */
  private async construirLineas(
    entradas: NuevaOrden["lineas"],
    descuentoCliente: number,
  ): Promise<Omit<LineaOrden, "id">[]> {
    const lineasSinId: Omit<LineaOrden, "id">[] = [];
    for (const entrada of entradas) {
      const producto = await this.obtenerProducto(entrada.productoId);
      if (!producto) {
        throw new Error(`Producto ${entrada.productoId} no encontrado`);
      }
      lineasSinId.push(
        construirLinea(
          producto,
          {
            productoId: entrada.productoId,
            cantidad: entrada.cantidad,
            descuentoPct: entrada.descuentoPct,
          },
          descuentoCliente,
        ),
      );
    }
    return lineasSinId;
  }

  /** Convierte líneas de dominio a filas para insertar en orden_lineas. */
  private filasLineas(ordenId: string, lineas: Omit<LineaOrden, "id">[]) {
    return lineas.map((l) => ({
      orden_id: ordenId,
      producto_id: l.productoId,
      codigo: l.codigo,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
      descuento_pct: l.descuentoPct,
      iva_pct: l.ivaPct,
      total_linea: l.totalLinea,
    }));
  }

  async crearOrden(datos: NuevaOrden): Promise<Orden> {
    const sb = await crearClienteServidor();

    const cliente = await this.obtenerCliente(datos.clienteId);
    if (!cliente) throw new Error("Cliente no encontrado");

    // Construye líneas con snapshot del producto y el descuento del cliente.
    const lineasSinId = await this.construirLineas(
      datos.lineas,
      cliente.descuentoPct,
    );

    const totales = calcularTotales(lineasSinId);

    // Consecutivo único desde la secuencia de Postgres (sin carreras).
    const { data: numero, error: errSeq } = await sb.rpc("siguiente_consecutivo");
    if (errSeq) throw new Error(errSeq.message);
    const prefijo = datos.estado === "pedido" ? "PED" : "COT";
    const consecutivo = `${prefijo}-${String(numero).padStart(6, "0")}`;

    // Inserta la orden. vendedor_id lo toma RLS de auth.uid() vía default? No:
    // se envía explícito; RLS valida que coincida con el usuario logueado.
    const { data: filaOrden, error: errOrden } = await sb
      .from("ordenes")
      .insert({
        consecutivo,
        estado: datos.estado,
        vendedor_id: datos.vendedorId,
        cliente_id: datos.clienteId,
        subtotal: totales.subtotal,
        descuento_total: totales.descuentoTotal,
        iva: totales.iva,
        total: totales.total,
      })
      .select("id")
      .single();
    if (errOrden) throw new Error(errOrden.message);

    const ordenId = (filaOrden as { id: string }).id;

    const { error: errLineas } = await sb
      .from("orden_lineas")
      .insert(this.filasLineas(ordenId, lineasSinId));
    if (errLineas) throw new Error(errLineas.message);

    const creada = await this.obtenerOrden(ordenId);
    if (!creada) throw new Error("No se pudo leer la orden creada");
    return creada;
  }

  async editarOrden(id: string, datos: EdicionOrden): Promise<Orden> {
    const sb = await crearClienteServidor();

    const existente = await this.obtenerOrden(id);
    if (!existente) throw new Error("Orden no encontrada");
    if (existente.estado !== "cotizacion")
      throw new Error("Solo se editan cotizaciones");

    const cliente = await this.obtenerCliente(datos.clienteId);
    if (!cliente) throw new Error("Cliente no encontrado");

    const lineasSinId = await this.construirLineas(
      datos.lineas,
      cliente.descuentoPct,
    );
    const totales = calcularTotales(lineasSinId);

    // Actualiza el encabezado (el trigger refresca actualizada_en).
    const { error: errOrden } = await sb
      .from("ordenes")
      .update({
        cliente_id: datos.clienteId,
        subtotal: totales.subtotal,
        descuento_total: totales.descuentoTotal,
        iva: totales.iva,
        total: totales.total,
      })
      .eq("id", id);
    if (errOrden) throw new Error(errOrden.message);

    // Reemplaza las líneas: borra las anteriores e inserta las nuevas.
    const { error: errBorrar } = await sb
      .from("orden_lineas")
      .delete()
      .eq("orden_id", id);
    if (errBorrar) throw new Error(errBorrar.message);

    const { error: errLineas } = await sb
      .from("orden_lineas")
      .insert(this.filasLineas(id, lineasSinId));
    if (errLineas) throw new Error(errLineas.message);

    const actualizada = await this.obtenerOrden(id);
    if (!actualizada) throw new Error("No se pudo leer la orden actualizada");
    return actualizada;
  }

  async obtenerOrden(id: string): Promise<Orden | null> {
    const sb = await crearClienteServidor();
    const { data, error } = await sb
      .from("ordenes")
      .select(SELECT_ORDEN)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? aOrden(data as unknown as FilaOrden) : null;
  }

  async listarOrdenes(filtro: FiltroOrdenes = {}): Promise<Orden[]> {
    const sb = await crearClienteServidor();
    let consulta = sb.from("ordenes").select(SELECT_ORDEN);
    if (filtro.vendedorId) consulta = consulta.eq("vendedor_id", filtro.vendedorId);
    if (filtro.estado) consulta = consulta.eq("estado", filtro.estado);

    const { data, error } = await consulta.order("creada_en", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as unknown as FilaOrden[]).map(aOrden);
  }

  async cambiarEstadoOrden(
    id: string,
    estado: Orden["estado"],
    worldOfficeDocId?: string,
  ): Promise<Orden> {
    const sb = await crearClienteServidor();

    const actual = await this.obtenerOrden(id);
    if (!actual) throw new Error("Orden no encontrada");

    const cambios: Record<string, unknown> = { estado };
    if (worldOfficeDocId) cambios.world_office_doc_id = worldOfficeDocId;
    // Al pasar a pedido, el consecutivo COT- se vuelve PED-.
    if (estado === "pedido" && actual.consecutivo.startsWith("COT-")) {
      cambios.consecutivo = actual.consecutivo.replace("COT-", "PED-");
    }

    const { error } = await sb.from("ordenes").update(cambios).eq("id", id);
    if (error) throw new Error(error.message);

    const actualizada = await this.obtenerOrden(id);
    if (!actualizada) throw new Error("No se pudo leer la orden actualizada");
    return actualizada;
  }

  // --- Usuarios (gestión del administrador, vía service role) ---------------
  async listarUsuarios(): Promise<Usuario[]> {
    const admin = crearClienteAdmin();
    const { data, error } = await admin
      .from("perfiles")
      .select("*")
      .order("creado_en");
    if (error) throw new Error(error.message);
    return (data as FilaPerfil[]).map(aUsuario);
  }

  async crearUsuario(datos: NuevoUsuario): Promise<Usuario> {
    const admin = crearClienteAdmin();

    // 1) Cuenta en Supabase Auth con la contraseña inicial que fija el admin.
    //    email_confirm: true → la cuenta queda activa sin paso extra de correo.
    //    (Alternativa: admin.auth.admin.inviteUserByEmail para que el usuario
    //     fije su propia contraseña; requiere SMTP configurado en Supabase.)
    const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
      email: datos.email,
      password: datos.clave,
      email_confirm: true,
      user_metadata: { nombre: datos.nombre },
    });
    if (errAuth || !creado.user) {
      throw new Error(errAuth?.message ?? "No se pudo crear la cuenta");
    }

    // 2) Perfil con rol y datos del negocio.
    const { data: perfil, error: errPerfil } = await admin
      .from("perfiles")
      .insert({
        id: creado.user.id,
        email: datos.email,
        nombre: datos.nombre,
        rol: datos.rol,
        activo: true,
      })
      .select("*")
      .single();
    if (errPerfil) {
      // Rollback: si falla el perfil, elimina la cuenta de Auth para no dejar
      // usuarios huérfanos.
      await admin.auth.admin.deleteUser(creado.user.id);
      throw new Error(errPerfil.message);
    }

    return aUsuario(perfil as FilaPerfil);
  }

  async eliminarUsuario(id: string): Promise<void> {
    const admin = crearClienteAdmin();
    // Borrar la cuenta de Auth elimina el perfil por FK on delete cascade.
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  }

  // --- Autenticación --------------------------------------------------------
  // En modo Supabase el login lo maneja Supabase Auth (ver src/lib/auth).
  // Estos métodos del contrato no se usan en este modo.
  async validarCredenciales(): Promise<Usuario | null> {
    return null;
  }

  async obtenerUsuario(id: string): Promise<Usuario | null> {
    const admin = crearClienteAdmin();
    const { data, error } = await admin
      .from("perfiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? aUsuario(data as FilaPerfil) : null;
  }
}
