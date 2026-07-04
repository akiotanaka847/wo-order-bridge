/**
 * Notificador por Gmail (producción).
 *
 * Envía el correo con la **API REST de Gmail** (`users.messages.send`) usando
 * OAuth2. Se eligió la API en vez de SMTP porque la API funciona con el scope
 * mínimo `https://www.googleapis.com/auth/gmail.send`; el SMTP de Gmail exige el
 * scope amplio `https://mail.google.com/`. Las credenciales viven en variables
 * de entorno (nunca en el código). Cómo obtener el refresh token: ver el manual
 * y el plan de integración.
 */

import type { Orden } from "@/domain/tipos";
import type { Notificador } from "./notificador";
import { correoPedidoNuevo } from "./plantilla";

export interface ConfigGmail {
  sender: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ENVIO_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export class NotificadorGmail implements Notificador {
  constructor(private readonly config: ConfigGmail) {}

  /** Renueva un access token de corta vida a partir del refresh token. */
  private async obtenerAccessToken(): Promise<string> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      throw new Error(
        `No se pudo renovar el token de Gmail (${res.status}): ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("Gmail no devolvió access_token al renovar.");
    }
    return data.access_token;
  }

  /** Arma el mensaje MIME (texto + HTML) y lo codifica en base64url. */
  private construirMensaje(para: string, asunto: string, texto: string, html: string): string {
    const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
    const asuntoCodificado = `=?UTF-8?B?${b64(asunto)}?=`;
    const limite = `wo_${Date.now().toString(36)}`;

    const mime = [
      `From: ${this.config.sender}`,
      `To: ${para}`,
      `Subject: ${asuntoCodificado}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${limite}"`,
      "",
      `--${limite}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      b64(texto),
      `--${limite}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      b64(html),
      `--${limite}--`,
      "",
    ].join("\r\n");

    return Buffer.from(mime, "utf-8").toString("base64url");
  }

  async notificarPedidoNuevo(orden: Orden): Promise<void> {
    const correo = correoPedidoNuevo(orden);
    const accessToken = await this.obtenerAccessToken();
    const raw = this.construirMensaje(
      correo.para,
      correo.asunto,
      correo.cuerpoTexto,
      correo.cuerpoHtml,
    );

    const res = await fetch(ENVIO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      throw new Error(
        `La API de Gmail rechazó el envío (${res.status}): ${await res.text()}`,
      );
    }
  }
}
