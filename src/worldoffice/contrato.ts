/**
 * CONTRATO de integración con World Office Cloud.
 *
 * Define la interfaz que la plataforma usa para hablar con World Office, SIN
 * acoplarse a cómo está implementada. Hay dos implementaciones:
 *
 *   - cliente-mock.ts  → simula la API. Es lo que corre durante el concurso.
 *   - cliente-live.ts  → llamadas HTTP reales. Lo completa el ganador con la
 *                        cuenta real del cliente (el 10% final).
 *
 * Gracias a este contrato, pasar de mock a producción NO toca el resto de la
 * app: solo cambia la variable de entorno WORLDOFFICE_MODE.
 */

import type { Cliente, Orden, Producto } from "@/domain/tipos";
import type { PayloadPedidoWorldOffice } from "./payload";

/** Resultado de crear un documento (pedido/factura) en World Office. */
export interface ResultadoWorldOffice {
  ok: boolean;
  /** Id del documento creado en World Office (ej. "PED-WO-000987"). */
  documentoId: string | null;
  /** Mensaje legible para mostrar/registrar. */
  mensaje: string;
  /** Payload exacto enviado, para auditoría y trazabilidad. */
  payloadEnviado: PayloadPedidoWorldOffice;
}

/** Estado de inventario de un producto consultado en vivo. */
export interface InventarioVivo {
  codigo: string;
  disponible: number;
  consultadoEn: string; // ISO 8601
}

/** Resultado de crear un maestro (tercero o inventario) en World Office. */
export interface ResultadoCreacionWO {
  ok: boolean;
  /** Id del registro creado en World Office (null si falló). */
  id: string | null;
  mensaje: string;
}

/** Un chequeo del diagnóstico de conexión con World Office. */
export interface ChequeoWorldOffice {
  /** Nombre legible del chequeo (ej. "Token configurado"). */
  nombre: string;
  /** true = pasó; false = falló; null = no aplica / no verificable ahora. */
  ok: boolean | null;
  /** Detalle legible del resultado. */
  detalle: string;
}

/**
 * Operaciones que la plataforma necesita de World Office Cloud.
 * El plan detallado de cómo se mapea cada una a la API real está en
 * docs/INTEGRACION-WORLD-OFFICE.md.
 */
export interface ClienteWorldOffice {
  /** Crea el pedido en World Office a partir de una orden de la plataforma. */
  crearPedido(orden: Orden): Promise<ResultadoWorldOffice>;

  /** Convierte un pedido existente en factura (acción del área contable). */
  convertirEnFactura(orden: Orden): Promise<ResultadoWorldOffice>;

  /** Consulta el inventario disponible de uno o varios códigos. */
  consultarInventario(codigos: string[]): Promise<InventarioVivo[]>;

  /** Crea un tercero (cliente) en World Office. */
  crearTercero(cliente: Cliente): Promise<ResultadoCreacionWO>;

  /** Crea un ítem de inventario (producto) en World Office. */
  crearInventario(producto: Producto): Promise<ResultadoCreacionWO>;

  /**
   * Chequea la conexión y la configuración con World Office (token, IDs y una
   * llamada real de prueba). Para la pantalla de diagnóstico del administrador.
   */
  diagnosticar(): Promise<ChequeoWorldOffice[]>;
}
