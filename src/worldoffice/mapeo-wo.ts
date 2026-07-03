/**
 * Mapeo de una Orden interna al documento de venta REAL de World Office.
 *
 * La API referencia inventario y terceros por ID numérico, no por código
 * contable ni NIT. Por eso este mapeo recibe los IDs ya resueltos (ver
 * `cliente-live.ts`, que los obtiene de los servicios de inventario y terceros).
 * Los campos siguen `CrearDocumentoEncabezadoPojo` de la spec real (renglones
 * con "n", valorTotal e idCentroCosto por línea, prefijo y concepto en el
 * encabezado). Mantener este paso aislado hace que cualquier ajuste toque un
 * solo archivo.
 */

import type { Orden } from "@/domain/tipos";
import type { DocumentoVentaWO, RenglonWO } from "./tipos-wo";

/** Valores de configuración contable del cliente (desde variables de entorno). */
export interface ConfigDocumentoWO {
  idEmpresa: number;
  /** Tercero interno: responsable/vendedor en World Office. */
  idTerceroInterno: number;
  idFormaPago: number;
  idMoneda: number;
  idBodega: number;
  /** Centro de costo por defecto para los renglones (0 = no enviar). */
  idCentroCosto: number;
  /** Prefijo del consecutivo del documento en World Office. */
  prefijo: number;
  /** Código del tipo de documento a crear (ej. "FV", "PD"). */
  documentoTipo: string;
  /** Tasa de cambio (TRM). Para COP es 1. */
  trm: number;
}

/** IDs resueltos contra World Office necesarios para armar el documento. */
export interface IdsResueltos {
  /** ID del cliente (tercero externo) en World Office. */
  idTerceroExterno: number;
  /** Mapa código contable → idInventario de World Office. */
  idInventarioPorCodigo: Map<string, number>;
}

/** Convierte una orden interna en el cuerpo que espera World Office. */
export function aDocumentoVentaWO(
  orden: Orden,
  config: ConfigDocumentoWO,
  ids: IdsResueltos,
): DocumentoVentaWO {
  const renglones: RenglonWO[] = orden.lineas.map((l) => {
    const idInventario = ids.idInventarioPorCodigo.get(l.codigo);
    if (idInventario === undefined) {
      throw new Error(
        `No se encontró el idInventario de World Office para el código ${l.codigo}`,
      );
    }
    return {
      idInventario,
      unidadMedida: "und", // World Office toma la unidad del propio ítem de inventario
      cantidad: l.cantidad,
      valorUnitario: l.precioUnitario,
      valorTotal: l.precioUnitario * l.cantidad, // sin IVA; World Office aplica el impuesto del ítem
      idBodega: config.idBodega,
      // El swagger de WO lista idCentroCosto en el renglón. Solo se envía si
      // está configurado: mandar 0 sería un id inválido.
      ...(config.idCentroCosto > 0 ? { idCentroCosto: config.idCentroCosto } : {}),
      concepto: l.descripcion,
      porDescuento: l.descuentoPct,
    };
  });

  return {
    fecha: orden.creadaEn.slice(0, 10),
    documentoTipo: config.documentoTipo,
    prefijo: config.prefijo,
    concepto: `Orden ${orden.consecutivo} - ${orden.clienteNombre}`,
    idEmpresa: config.idEmpresa,
    idTerceroExterno: ids.idTerceroExterno,
    idTerceroInterno: config.idTerceroInterno,
    idFormaPago: config.idFormaPago,
    idMoneda: config.idMoneda,
    trm: config.trm,
    porcentajeDescuento: true, // el descuento va como porcentaje (porDescuento)
    porcentajeTodosRenglones: true,
    valDescuento: 0,
    renglones,
  };
}
