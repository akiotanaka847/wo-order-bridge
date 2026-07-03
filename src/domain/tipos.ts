/**
 * Tipos de dominio de la plataforma.
 *
 * Esta es la ÚNICA fuente de verdad para las entidades del negocio.
 * Tanto el frontend (paneles) como el backend (rutas API, capa World Office)
 * importan desde aquí para evitar definiciones duplicadas y desincronizadas.
 */

// ---------------------------------------------------------------------------
// Roles y usuarios
// ---------------------------------------------------------------------------

/** Los tres roles del sistema. Cada uno tiene su propio panel. */
export type Rol = "vendedor" | "contable" | "administrador";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type CategoriaProducto =
  | "sellos_mecanicos"
  | "capacitores"
  | "refrigeracion";

/**
 * Producto del catálogo.
 *
 * `codigo` es el CÓDIGO CONTABLE que viaja a World Office. Se conserva siempre
 * asociado al producto aunque el vendedor busque y seleccione por descripción.
 * Ejemplo: codigo "0100178" = "Sello mecánico 7 octavos, resorte corto Parxial".
 */
/** Tipo de ítem de inventario en World Office. */
export type TipoProducto = "producto" | "servicio";

export interface Producto {
  id: string;
  codigo: string;
  descripcion: string;
  categoria: CategoriaProducto; // "clasificación de inventario" en World Office
  marca: string;
  unidad: string; // "UND", "JGO", etc. (unidad de medida)
  precio: number; // COP, sin IVA
  ivaPct: number; // porcentaje de IVA (ej. 19)
  stock: number; // inventario disponible (en vivo desde World Office en producción)
  activo: boolean;

  // --- Campos adicionales de World Office (opcionales) ---
  grupo?: string | null; // grupo de inventario
  tipo?: TipoProducto; // producto o servicio
  manejaInventario?: boolean; // si controla existencias
  cuentaVenta?: string | null; // cuenta contable de venta
  cuentaCompra?: string | null; // cuenta contable de compra
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

/** Tipo de identificación del tercero (según World Office). */
export type TipoIdentificacion = "NIT" | "CC" | "CE" | "PASAPORTE" | "TI";

/** Naturaleza jurídica del tercero. */
export type TipoPersona = "natural" | "juridica";

/**
 * Cliente (tercero) al que se le cotiza. El `descuentoPct` es el "descuento del
 * cliente" que el vendedor aplica al armar la cotización.
 *
 * Los campos adicionales replican lo que World Office maneja para un tercero.
 * Son OPCIONALES: el cotizador solo necesita nombre + NIT + descuento; el resto
 * enriquece la ficha y viaja a World Office al crear el tercero.
 */
export interface Cliente {
  id: string;
  nombre: string; // razón social o nombre completo
  nit: string; // número de identificación
  email: string | null;
  descuentoPct: number; // descuento pactado para este cliente
  creadoEn: string;

  // --- Identificación ---
  tipoIdentificacion?: TipoIdentificacion;
  digitoVerificacion?: string | null;
  tipoPersona?: TipoPersona;
  primerNombre?: string | null;
  segundoNombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;

  // --- Contacto ---
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;

  // --- Comercial ---
  esCliente?: boolean;
  esProveedor?: boolean;
  clasificacion?: string | null;
  zona?: string | null;
  plazoDias?: number | null;
  cupoCredito?: number | null;
  listaPrecios?: string | null;

  // --- Fiscal ---
  tipoContribuyente?: string | null;
  clasificacionDian?: string | null;
  responsabilidadesFiscales?: string | null;

  activo?: boolean;
}

// ---------------------------------------------------------------------------
// Órdenes (cotización → pedido → factura)
// ---------------------------------------------------------------------------

/**
 * Estado de una orden a lo largo de su ciclo de vida:
 *  - cotizacion: el vendedor la está armando / la guardó como cotización.
 *  - pedido:     el vendedor la convirtió en pedido; el contable la ve en vivo.
 *  - facturado:  el contable la convirtió en factura dentro de World Office.
 */
export type EstadoOrden = "cotizacion" | "pedido" | "facturado";

/**
 * Línea de una orden. Guarda un SNAPSHOT del producto (código, descripción,
 * precio) en el momento de la cotización, para que cambios futuros en el
 * catálogo no alteren órdenes ya creadas.
 */
export interface LineaOrden {
  id: string;
  productoId: string;
  codigo: string; // código contable congelado para World Office
  descripcion: string;
  cantidad: number;
  precioUnitario: number; // COP, sin IVA
  descuentoPct: number;
  ivaPct: number;
  /** Total de la línea con descuento e IVA aplicados. Calculado, no editable. */
  totalLinea: number;
}

export interface Orden {
  id: string;
  /** Consecutivo legible, ej. "COT-000123" / "PED-000123". */
  consecutivo: string;
  estado: EstadoOrden;
  vendedorId: string;
  vendedorNombre: string;
  clienteId: string;
  clienteNombre: string;
  clienteNit: string; // NIT congelado; es la identificación del tercero en World Office
  lineas: LineaOrden[];
  subtotal: number; // suma de líneas sin IVA, antes de descuento
  descuentoTotal: number;
  iva: number;
  total: number;
  /** Id del documento creado en World Office tras facturar (null hasta entonces). */
  worldOfficeDocId: string | null;
  creadaEn: string;
  actualizadaEn: string;
}

// ---------------------------------------------------------------------------
// Utilidades de tipos
// ---------------------------------------------------------------------------

/** Datos mínimos para crear una línea (lo que envía el panel del vendedor). */
export interface NuevaLinea {
  productoId: string;
  cantidad: number;
  descuentoPct?: number;
}
