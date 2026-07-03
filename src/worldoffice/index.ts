/**
 * Punto de entrada de la integración World Office.
 *
 * Devuelve la implementación correcta del cliente según WORLDOFFICE_MODE.
 * El resto de la app SIEMPRE importa desde aquí y nunca instancia un cliente
 * concreto, de modo que el cambio mock → live es transparente.
 */

import { ClienteWorldOfficeLive, RUTAS_WO_DEFECTO } from "./cliente-live";
import { ClienteWorldOfficeMock } from "./cliente-mock";
import type { ClienteWorldOffice } from "./contrato";

let instancia: ClienteWorldOffice | null = null;

/** Obtiene el cliente World Office (singleton por proceso). */
export function obtenerClienteWorldOffice(): ClienteWorldOffice {
  if (instancia) return instancia;

  const modo = process.env.WORLDOFFICE_MODE ?? "mock";
  const empresaId = process.env.WORLDOFFICE_EMPRESA_ID ?? "EMPRESA-DEMO";

  if (modo === "live") {
    const num = (clave: string) => Number(process.env[clave] ?? 0);
    const ruta = (clave: string, defecto: string) =>
      process.env[clave]?.trim() || defecto;
    instancia = new ClienteWorldOfficeLive({
      baseUrl:
        process.env.WORLDOFFICE_API_BASE_URL ?? "https://api.worldoffice.cloud/api/v1",
      token: process.env.WORLDOFFICE_API_TOKEN ?? "",
      idEmpresa: num("WORLDOFFICE_ID_EMPRESA"),
      idTerceroInterno: num("WORLDOFFICE_ID_TERCERO_INTERNO"),
      idFormaPago: num("WORLDOFFICE_ID_FORMA_PAGO"),
      idMoneda: num("WORLDOFFICE_ID_MONEDA"),
      idBodega: num("WORLDOFFICE_ID_BODEGA"),
      idCentroCosto: num("WORLDOFFICE_ID_CENTRO_COSTO"),
      prefijo: num("WORLDOFFICE_PREFIJO"),
      trm: Number(process.env.WORLDOFFICE_TRM ?? 1),
      documentoTipo: process.env.WORLDOFFICE_DOCTIPO_FACTURA ?? "FV",
      documentoTipoPedido: process.env.WORLDOFFICE_DOCTIPO_PEDIDO ?? "PD",
      campoRenglones: ruta("WORLDOFFICE_CAMPO_RENGLONES", "renglones"),
      cruzarDetalles: (process.env.WORLDOFFICE_CRUZAR_DETALLES ?? "false") === "true",
      rutas: {
        crearDocumento: ruta(
          "WORLDOFFICE_RUTA_CREAR_DOCUMENTO",
          RUTAS_WO_DEFECTO.crearDocumento,
        ),
        editarDocumento: ruta(
          "WORLDOFFICE_RUTA_EDITAR_DOCUMENTO",
          RUTAS_WO_DEFECTO.editarDocumento,
        ),
        inventarios: ruta(
          "WORLDOFFICE_RUTA_INVENTARIOS",
          RUTAS_WO_DEFECTO.inventarios,
        ),
        clasificaciones: ruta(
          "WORLDOFFICE_RUTA_CLASIFICACIONES",
          RUTAS_WO_DEFECTO.clasificaciones,
        ),
        terceros: ruta("WORLDOFFICE_RUTA_TERCEROS", RUTAS_WO_DEFECTO.terceros),
      },
      timeoutMs: Number(process.env.WORLDOFFICE_TIMEOUT_MS ?? 15000),
      maxReintentos: Number(process.env.WORLDOFFICE_MAX_REINTENTOS ?? 3),
    });
  } else {
    instancia = new ClienteWorldOfficeMock(empresaId);
  }

  return instancia;
}

export type { ClienteWorldOffice } from "./contrato";
export * from "./payload";
