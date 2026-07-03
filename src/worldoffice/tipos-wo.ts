/**
 * Tipos REALES de la API de World Office Cloud.
 *
 * Verificados contra la especificación oficial (`devapidoc.worldoffice.cloud`,
 * `swagger.json`): el documento de venta se crea con `CrearDocumentoEncabezadoPojo`
 * y sus líneas se llaman **`renglones`** (con "n"). Los IDs son numéricos y el
 * `documentoTipo` es un código (FV, PD, NCV, ...).
 *
 * Los valores que dependen de la configuración contable del cliente (empresa,
 * forma de pago, moneda, bodega, centro de costo, prefijo, tipos de documento)
 * NO se inventan: vienen de variables de entorno y se confirman contra la cuenta.
 */

/** Un renglón (línea) del documento de venta, tal como lo espera World Office. */
export interface RenglonWO {
  /** ID numérico del ítem en el inventario de World Office (no el código contable). */
  idInventario: number;
  unidadMedida: string;
  cantidad: number;
  valorUnitario: number;
  /** Valor total de la línea (cantidad × valorUnitario, sin IVA). */
  valorTotal: number;
  idBodega: number;
  /** Centro de costo de la línea. Solo se envía si está configurado (> 0). */
  idCentroCosto?: number;
  concepto: string;
  /** Descuento de la línea en porcentaje (opcional). */
  porDescuento?: number;
}

/**
 * Cuerpo para crear/editar un documento de venta.
 * Crear:  POST /api/v1/documentos
 * Editar: PUT  /api/v1/documentos/editarDocumentoEncabezado
 */
export interface DocumentoVentaWO {
  /** Id del documento. Se omite al crear; se incluye al editar. */
  id?: number;
  fecha: string; // YYYY-MM-DD
  /** Código del tipo de documento: FV, PD, NCV, NDV, CZ, REM. */
  documentoTipo: string;
  /** Prefijo del consecutivo en World Office (numérico). */
  prefijo: number;
  concepto: string;
  idEmpresa: number;
  /** Tercero externo = cliente. */
  idTerceroExterno: number;
  /** Tercero interno = vendedor/responsable. */
  idTerceroInterno: number;
  idFormaPago: number;
  idMoneda: number;
  /** Tasa de cambio (TRM). Para COP es 1. */
  trm: number;
  /** true si el descuento se maneja como porcentaje. */
  porcentajeDescuento: boolean;
  /** true si el descuento aplica a todos los renglones. */
  porcentajeTodosRenglones: boolean;
  valDescuento: number;
  /**
   * Líneas del documento. El swagger.json oficial define `renglones` (los
   * ejemplos del portal muestran `reglones`, con typo). El cliente live lo
   * emite con el nombre configurado en `WORLDOFFICE_CAMPO_RENGLONES`
   * (por defecto `renglones`).
   */
  renglones: RenglonWO[];
  /** Documento que se cruza (ej. el pedido al facturar). Opcional. */
  idFactura?: number;
  /** IDs de renglones del documento cruzado. Opcional. */
  idDetalles?: number[];
}

/** Respuesta del servicio de token (gestionarTokenAPILicencia). */
export interface RespuestaTokenWO {
  token: string;
}
