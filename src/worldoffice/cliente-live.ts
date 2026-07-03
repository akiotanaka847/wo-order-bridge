/**
 * Implementación LIVE del cliente World Office Cloud (API real).
 *
 * Construida contra la documentación pública de World Office
 * (https://devapidoc.worldoffice.cloud). Toda la app ya consume el contrato
 * `ClienteWorldOffice`; para producción solo falta tener el token real de la
 * cuenta Enterprise y confirmar los IDs de configuración contable (empresa,
 * forma de pago, moneda, bodega, tipos de documento). Esos valores vienen de
 * variables de entorno, nunca del código.
 *
 * Robustez (timeout, reintentos, backoff, Retry-After) vive en `http-wo.ts`.
 * Las rutas de los servicios cuyo nombre exacto se confirma contra la cuenta
 * real son CONFIGURABLES por variable de entorno: ajustar la integración = tocar
 * `.env`, no el código.
 *
 * Detalles reales de la API (verificados en swagger.json):
 *   - Base:      https://api.worldoffice.cloud/api/v1
 *   - Auth:      header  Authorization: WO <token>   (NO es Bearer)
 *   - Crear:     POST /documentos                     (CrearDocumentoEncabezadoPojo)
 *   - Editar:    PUT  /documentos/editarDocumentoEncabezado
 *   - Tercero:   GET  /terceros/identificacion/{identificacion}
 *   - Inventario: GET /inventarios/{codigo}
 */

import type { Cliente, Orden, Producto } from "@/domain/tipos";
import type {
  ChequeoWorldOffice,
  ClienteWorldOffice,
  InventarioVivo,
  ResultadoCreacionWO,
  ResultadoWorldOffice,
} from "./contrato";
import { HttpWorldOffice } from "./http-wo";
import { aDocumentoVentaWO, type ConfigDocumentoWO } from "./mapeo-wo";
import { construirPayloadWorldOffice } from "./payload";
import type { DocumentoVentaWO } from "./tipos-wo";

/** Rutas de los servicios de World Office (configurables por entorno). */
export interface RutasWorldOffice {
  /** Crear documento de venta: POST. */
  crearDocumento: string;
  /** Editar documento de venta (para cruzar pedido → factura): PUT. */
  editarDocumento: string;
  /** Base del recurso de inventarios (se le añade `/{codigo}` para consultar). */
  inventarios: string;
  /** Clasificaciones de inventario (las "categorías" de World Office). */
  clasificaciones: string;
  /** Base para resolver tercero por identificación (se le añade `/{nit}`). */
  terceros: string;
}

/**
 * Rutas por defecto según la especificación REAL de World Office
 * (swagger.json). La base ya incluye `/api/v1`, así que aquí van sin ese
 * prefijo. Se pueden sobrescribir por variable de entorno.
 */
export const RUTAS_WO_DEFECTO: RutasWorldOffice = {
  crearDocumento: "/documentos",
  editarDocumento: "/documentos/editarDocumentoEncabezado",
  inventarios: "/inventarios",
  clasificaciones: "/inventarios/clasificaciones",
  terceros: "/terceros/identificacion",
};

export interface ConfigWorldOfficeLive extends ConfigDocumentoWO {
  baseUrl: string;
  token: string;
  /** Tipo de documento para pedidos (los pedidos usan su propio código). */
  documentoTipoPedido: string;
  /**
   * Nombre del arreglo de líneas en el cuerpo. El swagger.json oficial define
   * `renglones`; queda configurable por si la cuenta real difiere (los ejemplos
   * del portal muestran `reglones`, con typo).
   */
  campoRenglones: string;
  /**
   * Si true, al facturar cruza el pedido renglón por renglón: consulta sus
   * renglones y envía `idDetalles`. Apagado por defecto hasta confirmarlo contra
   * la cuenta real (WORLDOFFICE_CRUZAR_DETALLES).
   */
  cruzarDetalles: boolean;
  /** Rutas de los servicios (permite confirmar sin tocar código). */
  rutas: RutasWorldOffice;
  timeoutMs: number;
  maxReintentos: number;
}

/**
 * Forma cruda de un ítem de inventario tal como lo devuelve World Office
 * (`GET /inventarios/{codigo}`). Los nombres exactos de los campos de
 * disponibilidad se confirman contra la cuenta real; por eso se leen de forma
 * tolerante.
 */
interface ItemInventarioWO {
  id?: number;
  codigo?: string;
  cantidad?: number;
  saldo?: number;
  disponible?: number;
}

export class ClienteWorldOfficeLive implements ClienteWorldOffice {
  private readonly http: HttpWorldOffice;

  constructor(private readonly config: ConfigWorldOfficeLive) {
    this.http = new HttpWorldOffice({
      baseUrl: config.baseUrl,
      token: config.token,
      timeoutMs: config.timeoutMs,
      maxReintentos: config.maxReintentos,
    });
  }

  /**
   * Resuelve el idInventario de World Office para cada código contable.
   * El código contable es la LLAVE: se conserva siempre aunque el vendedor
   * busque por descripción, y aquí traduce al id numérico que exige la API.
   */
  private async resolverInventario(
    codigos: string[],
  ): Promise<Map<string, number>> {
    const unicos = [...new Set(codigos)];
    const items = await Promise.all(
      unicos.map((codigo) => this.consultarInventarioPorCodigo(codigo)),
    );
    const mapa = new Map<string, number>();
    unicos.forEach((codigo, i) => {
      const id = items[i]?.id;
      if (typeof id === "number") mapa.set(codigo, id);
    });
    return mapa;
  }

  /**
   * Resuelve el idTerceroExterno (cliente) a partir del NIT.
   * Ruta real: GET /terceros/identificacion/{identificacion}.
   */
  private async resolverTercero(nit: string): Promise<number> {
    const data = await this.http.peticion<{ id?: number }>(
      "GET",
      `${this.config.rutas.terceros}/${encodeURIComponent(nit)}`,
    );
    if (!data || typeof data.id !== "number") {
      throw new Error(`No se encontró el tercero con NIT ${nit} en World Office`);
    }
    return data.id;
  }

  /**
   * Traduce el documento interno al cuerpo HTTP final: emite el arreglo de
   * líneas con el nombre que espera World Office (`renglones` según el swagger
   * oficial; configurable), sin acoplar el resto del código a ese nombre.
   */
  private aCuerpoHttp(documento: DocumentoVentaWO): Record<string, unknown> {
    const { renglones, ...encabezado } = documento;
    return { ...encabezado, [this.config.campoRenglones]: renglones };
  }

  /** Extrae la lista de una respuesta que puede venir directa o envuelta. */
  private extraerLista(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data;
      if (Array.isArray(obj.content)) return obj.content;
    }
    return [];
  }

  /**
   * Resuelve los `idDetalles` (ids de los renglones del pedido en World Office)
   * para cruzar el pedido en la factura. Cada renglón se identifica con `id`
   * (según los ejemplos oficiales de la API). Ruta:
   * GET /documentos/getRenglonesByDocumentoEncabezado/{idPedido}.
   */
  private async resolverIdDetalles(idPedido: number): Promise<number[]> {
    const data = await this.http.peticion<unknown>(
      "GET",
      `/documentos/getRenglonesByDocumentoEncabezado/${idPedido}`,
    );
    return this.extraerLista(data)
      .map((r) =>
        r && typeof r === "object" ? (r as Record<string, unknown>).id : undefined,
      )
      .filter((id): id is number => typeof id === "number");
  }

  /**
   * Envía un documento de venta (pedido o factura) a World Office.
   * @param facturaDe  Si viene, es el id del PEDIDO que se cruza para generar
   *                   la factura (campo `idFactura`); si no, se crea normal.
   */
  private async enviarDocumento(
    orden: Orden,
    documentoTipo: string,
    facturaDe?: number,
  ): Promise<ResultadoWorldOffice> {
    const payloadNeutro = construirPayloadWorldOffice(
      orden,
      String(this.config.idEmpresa),
      documentoTipo === this.config.documentoTipo ? "FACTURA_VENTA" : "PEDIDO",
    );

    try {
      const [idTerceroExterno, idInventarioPorCodigo] = await Promise.all([
        this.resolverTercero(orden.clienteNit),
        this.resolverInventario(orden.lineas.map((l) => l.codigo)),
      ]);

      // Al facturar (si está habilitado el cruce), trae los renglones del pedido
      // para enviar idDetalles. Si falla, sigue solo con idFactura (no rompe).
      let idDetalles: number[] | undefined;
      if (facturaDe !== undefined && this.config.cruzarDetalles) {
        try {
          const detalles = await this.resolverIdDetalles(facturaDe);
          if (detalles.length > 0) idDetalles = detalles;
        } catch {
          idDetalles = undefined;
        }
      }

      const documento: DocumentoVentaWO = {
        ...aDocumentoVentaWO(
          orden,
          { ...this.config, documentoTipo },
          { idTerceroExterno, idInventarioPorCodigo },
        ),
        // Al facturar, se cruza el pedido de origen (idFactura) y, si se resolvió,
        // sus renglones (idDetalles) para el cruce fino.
        ...(facturaDe !== undefined ? { idFactura: facturaDe } : {}),
        ...(idDetalles ? { idDetalles } : {}),
      };

      // Crear = POST /documentos. La respuesta trae el documento con su id.
      // El arreglo de líneas se emite con el nombre configurado
      // (`renglones` según el swagger oficial).
      const data = await this.http.peticion<{ id?: number }>(
        "POST",
        this.config.rutas.crearDocumento,
        this.aCuerpoHttp(documento),
      );

      return {
        ok: true,
        documentoId: data?.id != null ? String(data.id) : null,
        mensaje:
          facturaDe !== undefined
            ? "Factura creada en World Office (cruzando el pedido)."
            : "Documento creado en World Office.",
        payloadEnviado: payloadNeutro,
      };
    } catch (e) {
      return {
        ok: false,
        documentoId: null,
        mensaje: e instanceof Error ? e.message : "Error al enviar a World Office.",
        payloadEnviado: payloadNeutro,
      };
    }
  }

  async crearPedido(orden: Orden): Promise<ResultadoWorldOffice> {
    return this.enviarDocumento(orden, this.config.documentoTipoPedido);
  }

  async convertirEnFactura(orden: Orden): Promise<ResultadoWorldOffice> {
    // La factura CRUZA el pedido de origen (su id de World Office) para
    // descargar el pedido y mantener trazabilidad, en vez de duplicarlo.
    const idPedido = orden.worldOfficeDocId
      ? Number(orden.worldOfficeDocId)
      : undefined;
    const facturaDe = Number.isFinite(idPedido) ? idPedido : undefined;
    return this.enviarDocumento(orden, this.config.documentoTipo, facturaDe);
  }

  /**
   * Consulta UN ítem de inventario por su código contable
   * (`GET /inventarios/{codigo}`). Devuelve null si no existe o falla, para no
   * romper el flujo por un único código.
   */
  private async consultarInventarioPorCodigo(
    codigo: string,
  ): Promise<ItemInventarioWO | null> {
    try {
      const data = await this.http.peticion<ItemInventarioWO | null>(
        "GET",
        `${this.config.rutas.inventarios}/${encodeURIComponent(codigo)}`,
      );
      return data ?? null;
    } catch {
      return null;
    }
  }

  /** Toma la disponibilidad de un ítem sea cual sea el nombre del campo. */
  private disponibleDe(item: ItemInventarioWO | null): number {
    return item?.disponible ?? item?.saldo ?? item?.cantidad ?? 0;
  }

  async consultarInventario(codigos: string[]): Promise<InventarioVivo[]> {
    const unicos = [...new Set(codigos)];
    const ahora = new Date().toISOString();
    const items = await Promise.all(
      unicos.map((codigo) => this.consultarInventarioPorCodigo(codigo)),
    );
    return unicos.map((codigo, i) => ({
      codigo,
      disponible: this.disponibleDe(items[i]),
      consultadoEn: ahora,
    }));
  }

  /**
   * Crea un tercero (cliente) en World Office. Ruta: POST /terceros.
   *
   * NOTA: World Office referencia por ID numérico el tipo de identificación y la
   * ciudad (idUbicacionCiudad). Esos IDs viven en catálogos de la cuenta y se
   * resuelven/confirman contra la cuenta real; aquí se envían los datos que
   * tenemos y se marcan los que hay que mapear a id numérico.
   */
  async crearTercero(cliente: Cliente): Promise<ResultadoCreacionWO> {
    const cuerpo: Record<string, unknown> = {
      identificacion: cliente.nit,
      digitoVerificacion: cliente.digitoVerificacion ?? undefined,
      // Persona natural: nombres y apellidos; jurídica: razón social.
      primerNombre: cliente.primerNombre ?? undefined,
      segundoNombre: cliente.segundoNombre ?? undefined,
      primerApellido: cliente.primerApellido ?? undefined,
      segundoApellido: cliente.segundoApellido ?? undefined,
      nombreCompleto: cliente.nombre,
      email: cliente.email ?? undefined,
      telefono: cliente.telefono ?? undefined,
      direccion: cliente.direccion ?? undefined,
      // idUbicacionCiudad y idTipoIdentificacion son numéricos en WO: mapear
      // contra el catálogo de la cuenta real.
      ciudad: cliente.ciudad ?? undefined,
      tipoIdentificacion: cliente.tipoIdentificacion,
      esCliente: cliente.esCliente ?? true,
      esProveedor: cliente.esProveedor ?? false,
      plazo: cliente.plazoDias ?? undefined,
      cupoCredito: cliente.cupoCredito ?? undefined,
    };
    try {
      const data = await this.http.peticion<{ id?: number }>("POST", "/terceros", cuerpo);
      return {
        ok: true,
        id: data?.id != null ? String(data.id) : null,
        mensaje: "Tercero creado en World Office.",
      };
    } catch (e) {
      return {
        ok: false,
        id: null,
        mensaje: e instanceof Error ? e.message : "Error al crear el tercero.",
      };
    }
  }

  /**
   * Crea un ítem de inventario (producto) en World Office. Ruta: POST /inventarios.
   *
   * NOTA: clasificación, grupo y unidad de medida son IDs numéricos en WO
   * (idInventarioClasificacion, idInventarioGrupo, idUnidadMedida): se resuelven
   * contra los catálogos de la cuenta real.
   */
  async crearInventario(producto: Producto): Promise<ResultadoCreacionWO> {
    const cuerpo: Record<string, unknown> = {
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      // Los siguientes son IDs numéricos en WO: mapear contra el catálogo.
      clasificacion: producto.categoria,
      grupo: producto.grupo ?? undefined,
      unidadMedida: producto.unidad,
      tipo: producto.tipo ?? "producto",
      precioBase: producto.precio,
      porcentajeIva: producto.ivaPct,
      manejaInventario: producto.manejaInventario ?? true,
    };
    try {
      const data = await this.http.peticion<{ id?: number }>("POST", "/inventarios", cuerpo);
      return {
        ok: true,
        id: data?.id != null ? String(data.id) : null,
        mensaje: "Producto creado en World Office.",
      };
    } catch (e) {
      return {
        ok: false,
        id: null,
        mensaje: e instanceof Error ? e.message : "Error al crear el producto.",
      };
    }
  }

  async diagnosticar(): Promise<ChequeoWorldOffice[]> {
    const chequeos: ChequeoWorldOffice[] = [];

    // 1) Token presente (y no el placeholder de la plantilla).
    const tokenOk =
      !!this.config.token &&
      this.config.token !== "token-jwt-de-world-office";
    chequeos.push({
      nombre: "Token configurado",
      ok: tokenOk,
      detalle: tokenOk
        ? "Hay un token en WORLDOFFICE_API_TOKEN."
        : "Falta el token real en WORLDOFFICE_API_TOKEN.",
    });

    // 2) IDs de configuración de la cuenta.
    const requeridos: Array<[string, number]> = [
      ["idEmpresa", this.config.idEmpresa],
      ["idTerceroInterno", this.config.idTerceroInterno],
      ["idFormaPago", this.config.idFormaPago],
      ["idMoneda", this.config.idMoneda],
      ["idBodega", this.config.idBodega],
      // El swagger de WO lo lista dentro del renglón del documento.
      ["idCentroCosto", this.config.idCentroCosto],
      ["prefijo", this.config.prefijo],
    ];
    const faltantes = requeridos.filter(([, v]) => !v).map(([n]) => n);
    chequeos.push({
      nombre: "IDs de configuración",
      ok: faltantes.length === 0,
      detalle:
        faltantes.length === 0
          ? "Empresa, tercero interno, forma de pago, moneda, bodega, centro de costo y prefijo están configurados."
          : `Faltan por configurar: ${faltantes.join(", ")}.`,
    });

    // 3) Conexión y token válido: llamada real de prueba (tipos de documento).
    try {
      await this.http.peticion("GET", "/documentosTipos");
      chequeos.push({
        nombre: "Conexión con World Office",
        ok: true,
        detalle: "La API respondió correctamente a /documentosTipos (token válido).",
      });
    } catch (e) {
      chequeos.push({
        nombre: "Conexión con World Office",
        ok: false,
        detalle:
          e instanceof Error
            ? `No se pudo consultar /documentosTipos: ${e.message}`
            : "No se pudo consultar /documentosTipos.",
      });
    }

    // 4) Tipos de documento configurados.
    const tiposOk = !!this.config.documentoTipo && !!this.config.documentoTipoPedido;
    chequeos.push({
      nombre: "Tipos de documento",
      ok: tiposOk,
      detalle: tiposOk
        ? `Factura="${this.config.documentoTipo}", Pedido="${this.config.documentoTipoPedido}".`
        : "Falta configurar el código de tipo de documento de factura o pedido.",
    });

    return chequeos;
  }
}
