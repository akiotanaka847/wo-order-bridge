/**
 * Plantilla del correo de "pedido nuevo".
 *
 * Genera el asunto y el cuerpo (texto + HTML) a partir de una orden. Se reutiliza
 * tanto en el modo demo (consola) como en producción (Gmail), evitando duplicar
 * el contenido del mensaje.
 */

import { NOMBRE_APP, NOMBRE_EMPRESA } from "@/config/app";
import type { Orden } from "@/domain/tipos";
import { formatearPesos } from "@/lib/formato";
import type { CorreoSalida } from "./notificador";

/**
 * Colores de marca para el correo. En emails los estilos van EN LÍNEA y con
 * hex (no hay CSS ni variables), así que se replican aquí los tokens de marca
 * de `globals.css`. Cambiar la marca = ajustar estos valores.
 */
const MARCA = {
  primario: "#d63a13", // brand-600
  primarioOscuro: "#b32f10", // brand-700
  tinte: "#fef3f0", // brand-50
  tinteBorde: "#fde0d8", // brand-100
  texto: "#0f172a", // slate-900
  textoSuave: "#64748b", // slate-500
  borde: "#eef2f6",
  fondo: "#f1f5f9", // slate-100
};

/** Destinatario del área contable (configurable por entorno). */
function destinatarioContable(): string {
  return process.env.NOTIFICACIONES_CONTABLE_TO ?? "contabilidad@tu-empresa.com";
}

/** Construye el correo de aviso de pedido nuevo para el área contable. */
export function correoPedidoNuevo(orden: Orden): CorreoSalida {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const enlace = `${base}/contable`;

  const lineasTexto = orden.lineas
    .map((l) => `  - ${l.cantidad} x ${l.descripcion} (${l.codigo})`)
    .join("\n");

  const lineasHtml = orden.lineas
    .map((l, i) => {
      const fondo = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `<tr style="background:${fondo};">
        <td style="padding:12px 14px;border-bottom:1px solid ${MARCA.borde};text-align:center;color:${MARCA.textoSuave};font-size:14px;">${l.cantidad}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${MARCA.borde};color:${MARCA.texto};font-size:14px;">
          ${l.descripcion}
          <div style="color:#94a3b8;font-family:'Courier New',monospace;font-size:12px;margin-top:2px;">${l.codigo}</div>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${MARCA.borde};text-align:right;color:${MARCA.texto};font-size:14px;font-weight:600;white-space:nowrap;">${formatearPesos(l.totalLinea)}</td>
      </tr>`;
    })
    .join("");

  return {
    para: destinatarioContable(),
    asunto: `Nuevo pedido ${orden.consecutivo} — ${orden.clienteNombre}`,
    cuerpoTexto: [
      `Entró un pedido nuevo en ${NOMBRE_APP}.`,
      ``,
      `Consecutivo: ${orden.consecutivo}`,
      `Cliente: ${orden.clienteNombre}`,
      `Vendedor: ${orden.vendedorNombre}`,
      `Total: ${formatearPesos(orden.total)}`,
      ``,
      `Productos:`,
      lineasTexto,
      ``,
      `Revísalo y conviértelo en factura: ${enlace}`,
    ].join("\n"),
    cuerpoHtml: `
    <div style="margin:0;padding:24px 0;background:${MARCA.fondo};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MARCA.fondo};">
        <tr><td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">

            <!-- Encabezado de marca -->
            <tr><td style="background:${MARCA.primario};padding:24px 28px;">
              <div style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">${NOMBRE_EMPRESA}</div>
              <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">Nuevo pedido ${orden.consecutivo}</div>
            </td></tr>

            <!-- Cuerpo -->
            <tr><td style="padding:28px;">
              <p style="margin:0 0 20px;color:${MARCA.textoSuave};font-size:15px;">
                Entró un pedido nuevo listo para revisar y convertir en factura.
              </p>

              <!-- Datos -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MARCA.tinte};border:1px solid ${MARCA.tinteBorde};border-radius:10px;margin-bottom:22px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;color:${MARCA.texto};">
                    <strong style="color:${MARCA.textoSuave};font-weight:600;">Cliente:</strong> ${orden.clienteNombre}<br/>
                    <strong style="color:${MARCA.textoSuave};font-weight:600;">Vendedor:</strong> ${orden.vendedorNombre}
                  </td>
                  <td style="padding:14px 16px;text-align:right;vertical-align:top;">
                    <div style="color:${MARCA.textoSuave};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Total</div>
                    <div style="color:${MARCA.primario};font-size:22px;font-weight:700;">${formatearPesos(orden.total)}</div>
                  </td>
                </tr>
              </table>

              <!-- Detalle -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${MARCA.borde};border-radius:10px;overflow:hidden;border-collapse:separate;">
                <thead><tr style="background:#f8fafc;">
                  <th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${MARCA.textoSuave};border-bottom:1px solid ${MARCA.borde};">Cant.</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${MARCA.textoSuave};border-bottom:1px solid ${MARCA.borde};">Descripción</th>
                  <th style="padding:10px 14px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${MARCA.textoSuave};border-bottom:1px solid ${MARCA.borde};">Total</th>
                </tr></thead>
                <tbody>${lineasHtml}</tbody>
              </table>

              <!-- Botón -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
                <tr><td style="border-radius:10px;background:${MARCA.primario};">
                  <a href="${enlace}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">Abrir panel contable →</a>
                </td></tr>
              </table>
            </td></tr>

            <!-- Pie -->
            <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid ${MARCA.borde};">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                ${NOMBRE_APP} · Este es un aviso automático, no respondas a este correo.
              </p>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </div>
    `,
  };
}
