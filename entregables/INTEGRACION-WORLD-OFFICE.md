# Plan de integración con World Office Cloud (API)

> Este es el documento que describe **cómo se conecta la plataforma con World
> Office Cloud por API**. Es el 10% final del proyecto: se ejecuta contra la
> cuenta real del cliente, con contrato y accesos. Aquí se explica el qué, el
> cómo y el porqué, con los supuestos marcados y la forma de confirmarlos.

---

## 1. Resumen

La plataforma ya deja todo listo para enviar pedidos a World Office:

- Toda la app habla con World Office a través de **una sola interfaz**
  (`ClienteWorldOffice`, en `src/worldoffice/contrato.ts`).
- Durante el concurso corre la implementación **mock** (`cliente-mock.ts`), que
  simula las respuestas sin tocar la cuenta real.
- Para producción solo se completa la implementación **live**
  (`cliente-live.ts`) y se cambia una variable de entorno
  (`WORLDOFFICE_MODE=live`). **Nada más de la plataforma cambia.**

El archivo que se enviaría a World Office ya se genera hoy y se puede descargar
desde los paneles (botón "Estructura WO"). Lo construye
`construirPayloadWorldOffice()` — el **mismo** código que usará la conexión en
vivo, de modo que lo que se ve en el concurso es idéntico a lo que se enviará.

---

## 2. Arquitectura de la integración

```
Panel (vendedor/contable)
        │  llama
        ▼
obtenerClienteWorldOffice()        ← fábrica, elige mock o live por entorno
        │
        ├── ClienteWorldOfficeMock  (concurso: respuestas simuladas)
        └── ClienteWorldOfficeLive  (producción: HTTP real a World Office)
                 │ usa
                 ▼
        construirPayloadWorldOffice()  ← traduce Orden → JSON de World Office
```

**Por qué así:** aislar el proveedor detrás de una interfaz permite (a) construir
y demostrar el 90% sin acceso real, (b) cambiar a producción sin reescribir los
paneles, y (c) probar cada parte por separado.

---

## 3. Autenticación (real)

World Office Cloud expone una **API REST sobre HTTPS, con JSON y token JWT**
(plan Enterprise). Verificado contra la documentación pública:

- **URL base:** `https://api.worldoffice.cloud/api/v1`
- **Generación del token:** en World Office → Menú → Configuración →
  Configuración General → sección **API**: se genera para una cuenta de servicio
  y se copia.
- **Vencimiento (según la guía oficial):** la fecha de vencimiento del token es
  **configurable**, con un único límite: **no puede superar la fecha de
  vencimiento de la licencia**. Es decir, se puede emitir un token de larga
  duración; **no expira a las 12 horas**. Cuando venza (o se renueve la licencia),
  se genera uno nuevo en el panel y se actualiza `WORLDOFFICE_API_TOKEN` (sin
  tocar código).
- El token se guarda en `WORLDOFFICE_API_TOKEN` (variable de entorno, nunca en el
  código) y solo se usa desde el servidor.
- **Importante:** el token NO va como `Bearer`. La cabecera real es:

  ```http
  Authorization: WO <WORLDOFFICE_API_TOKEN>
  Content-Type: application/json
  Accept: application/json
  ```

  Si falta el token, la API responde `401 Unauthorized`. Esto ya está
  implementado en `headers()` de `cliente-live.ts`.

---

## 4. Endpoints que usa la plataforma (reales)

Todos cuelgan de `https://api.worldoffice.cloud/api/v1`.

Rutas tomadas de la documentación oficial (`developer.worldoffice.cloud`,
`devapidoc.worldoffice.cloud`). El **esquema exacto** de cada petición/respuesta
se confirma contra la cuenta real (no hay ambiente de pruebas público); por eso
las rutas y el nombre del arreglo de líneas son configurables por entorno.

| Operación | Método | Ruta | Para qué |
|---|---|---|---|
| Crear documento | `POST` | `/documentos` | Crea el documento (pedido o factura) con `CrearDocumentoEncabezadoPojo`. |
| Editar documento | `PUT` | `/documentos/editarDocumentoVenta` | Edita un documento de venta existente. |
| Consultar documento | `GET` | `/documentos/getDocumentoId/{id}` | Verifica el documento creado. |
| Renglones de documento | `GET` | `/documentos/getRenglonesByDocumentoEncabezado/{id}` | Renglones (para cruzar pedido→factura). |
| Anular documento | `POST` | `/documentos/anularDocumento/{id}` | Anula si hace falta. |
| Consultar inventario | `GET` | `/inventarios/{codigo}` | Resuelve un producto por código → `idInventario` y disponibilidad. |
| Listar inventarios | `GET` | `/inventarios?paginacionWo=…` | Lista paginada de productos. |
| Categorías | `GET` | `/inventarios/clasificaciones` | Clasificaciones de inventario ("categorías"). |
| Grupos | `GET` | `/inventarios/grupos` | Grupos de inventario. |
| Bodegas de un ítem | `GET` | `/inventarios/{inventarioId}/bodegas` | Existencias por bodega. |
| Tercero por identificación | `GET` | `/terceros/identificacion/{identificacion}` | Resuelve el cliente (NIT → `idTerceroExterno`). |
| Crear tercero | `POST` | `/terceros` | Crea un cliente/tercero desde el panel admin. |
| Crear inventario | `POST` | `/inventarios` | Crea un producto/ítem de inventario. |
| Tipos de documento | `GET` | `/documentosTipos` | Confirma el código `documentoTipo` de pedido y factura. |

### Búsqueda de productos y categorías (clasificación de inventario)

Verificado contra la **especificación real** de la API
(`devapidoc.worldoffice.cloud`, `swagger.json`). World Office **sí** expone
inventario y categorías por API:

- **Consultar/buscar producto:** `GET /api/v1/inventarios/{codigo}` (por código
  contable) y `GET /api/v1/inventarios` (listado **paginado** con `paginacionWo`:
  `pagina`, `registrosPorPagina`, `columnaOrdenar`, `orden`).
- **Categorías = clasificación de inventario:** `GET
  /api/v1/inventarios/clasificaciones`. Además existen **grupos**
  (`/inventarios/grupos`). Al crear un inventario (`CrearInventarioPojo`) se
  indican `idInventarioClasificacion` e `idInventarioGrupo`: cada producto
  pertenece a una clasificación y a un grupo.
- **Cómo lo usa la plataforma:** el cliente live resuelve cada código contable
  con `GET /inventarios/{codigo}` para obtener el `idInventario` y la
  disponibilidad (ver `resolverInventario` y `consultarInventario` en
  `cliente-live.ts`). En la interfaz, el buscador del vendedor y el inventario
  del administrador (búsqueda + filtro por categoría) reflejan exactamente estas
  capacidades. La `CategoriaProducto` del demo mapea 1:1 a la clasificación de
  inventario de World Office.

> **Rutas configurables:** todas las rutas se leen de variables de entorno
> (`WORLDOFFICE_RUTA_*`) con los defaults reales en `RUTAS_WO_DEFECTO`
> (`cliente-live.ts`). Confirmar la integración = cambiar `.env`, **sin tocar el
> código**.

> **Idempotencia:** World Office **no** ofrece un servicio para buscar un
> documento por referencia externa. Por eso la anti-duplicación se resuelve en la
> plataforma: al crear el pedido se guarda su `worldOfficeDocId` y solo se crea el
> documento si aún no existe; la factura **cruza** ese pedido (`idFactura`) en vez
> de duplicarlo.

El tipo de documento (`documentoTipo`) usa códigos: `"FV"` para **factura de
venta**; el de **pedido** se confirma con el servicio de tipos de documento (en
la plataforma es configurable: `WORLDOFFICE_DOCTIPO_PEDIDO`).

> **Pendiente de confirmar contra la cuenta real:** la forma exacta de la
> respuesta de `/inventarios/{codigo}` (nombre del campo de disponibilidad) y de
> `/terceros/identificacion/{nit}`. El código las aísla en `cliente-live.ts` (lee
> la disponibilidad de forma tolerante) para que el ajuste sea mínimo.

> **Crear tercero e inventario:** el admin crea clientes y productos con todos
> los campos que maneja World Office (identificación, persona, contacto,
> comercial, fiscal / clasificación, grupo, unidad, cuentas). Se guardan en la
> plataforma y, en modo live, se envían con `POST /terceros` y `POST /inventarios`
> (ver `crearTercero`/`crearInventario` en `cliente-live.ts`). **Pendiente contra
> la cuenta real:** WO referencia por **id numérico** el tipo de identificación,
> la ciudad (`idUbicacionCiudad`), la clasificación/grupo de inventario
> (`idInventarioClasificacion`/`idInventarioGrupo`) y la unidad de medida; esos
> ids se resuelven contra los catálogos de la cuenta. El código deja el mapeo
> aislado y marcado para ese ajuste.

> **Cruce fino pedido→factura (`idDetalles`):** ya está implementado en
> `cliente-live.ts` (`resolverIdDetalles`): al facturar consulta
> `GET /documentos/getRenglonesByDocumentoEncabezado/{idPedido}` y toma el `id`
> de cada renglón (nombre confirmado en los ejemplos oficiales). Lee la respuesta
> de forma tolerante (arreglo directo o envuelto en `data`/`content`). Va
> **apagado** por defecto (`WORLDOFFICE_CRUZAR_DETALLES=false`): el día del token
> se confirma la respuesta real y se pone en `true` — sin programar, solo
> activar. Con el interruptor apagado, la factura se crea solo con `idFactura`.

### Cómo confirmamos lo que no es público

World Office no ofrece ambiente de pruebas público; la validación final es contra
la cuenta real. Plan:

1. Con el token de la cuenta Enterprise, llamar **listar tipos de documento**,
   **inventario** y **terceros** para conocer los IDs reales.
2. Cargar esos IDs en variables de entorno (sección 5).
3. Validar con **un pedido de bajo monto**, revisando con `getDocumentoId` que
   entró bien.
4. Activar `WORLDOFFICE_MODE=live`.

---

## 5. Mapeo de datos (Orden → World Office)

Hay **dos estructuras**, a propósito:

### a) Estructura neutra (legible, descargable)

La que se descarga desde los paneles ("Estructura WO"). Usa código contable y
NIT — pensada para que un humano la revise. La genera `payload.ts`:

```json
{
  "tipoDocumento": "PEDIDO",
  "fecha": "2026-06-28",
  "tercero": { "identificacion": "901222333-4", "nombre": "Refrigeración Andina" },
  "renglones": [
    { "codigoProducto": "0100178", "cantidad": 2, "valorUnitario": 38500,
      "descuentoPorcentaje": 10, "porcentajeIva": 19 }
  ],
  "referenciaExterna": "PED-000001"
}
```

### b) Cuerpo REAL de World Office (lo que envía el cliente live)

La API real referencia **inventario y terceros por ID numérico**, no por código.
Sigue `CrearDocumentoEncabezadoPojo`, **verificado contra el `swagger.json`
oficial** (`devapidoc.worldoffice.cloud/swagger.json`):

- El arreglo de líneas se llama **`renglones`** según el swagger (los ejemplos
  del portal muestran `reglones`, con typo). Se emite con el nombre configurado
  en `WORLDOFFICE_CAMPO_RENGLONES` (por defecto `renglones`); si al probar el
  documento entrara sin líneas, se cambia a `reglones` en `.env` — una línea.
- El swagger confirma en el esquema de creación: `idEmpresa`,
  `idTerceroExterno`, `idTerceroInterno`, `idFormaPago`, `idMoneda`, `prefijo`,
  **`idFactura`** e **`idDetalles`** (cruce de documentos) y, por renglón,
  `idInventario`, `unidadMedida`, `cantidad`, `valorUnitario`, `valorTotal`,
  `idBodega`, `idCentroCosto`, `concepto`, `porDescuento`.
- `idCentroCosto` por línea se envía cuando está configurado (> 0); el
  diagnóstico lo valida.
- Se envía **`trm`** en el encabezado (1 para COP; `WORLDOFFICE_TRM`). No
  aparece en el swagger: si la cuenta lo rechazara, se retira sin más.

Lo genera `mapeo-wo.ts` y lo envía `cliente-live.ts` con `POST /documentos`. Al
facturar se usa el mismo `POST /documentos` **cruzando** el pedido (`idFactura`):

```json
{
  "fecha": "2026-06-28",
  "documentoTipo": "FV",
  "prefijo": 1,
  "concepto": "Orden PED-000001 - Refrigeración Andina",
  "idEmpresa": 2,
  "idTerceroExterno": 2946,
  "idTerceroInterno": 3664,
  "idFormaPago": 5,
  "idMoneda": 31,
  "trm": 1,
  "porcentajeDescuento": true,
  "porcentajeTodosRenglones": true,
  "valDescuento": 0,
  "renglones": [
    { "idInventario": 4517, "unidadMedida": "und", "cantidad": 2,
      "valorUnitario": 38500, "valorTotal": 77000, "idBodega": 1,
      "idCentroCosto": 1, "porDescuento": 10,
      "concepto": "Sello mecánico 7 octavos, resorte corto Parxial" }
  ],
  "idFactura": 8891
}
```

### Resolución de IDs (el punto clave de la integración)

Como World Office indexa por ID numérico, antes de enviar el documento hay que
traducir:

| Dato nuestro | Campo World Office | Cómo se resuelve |
|---|---|---|
| `codigo` contable (ej. `0100178`) | `idInventario` (ej. `4517`) | `GET /inventarios/{codigo}` → idInventario. |
| `clienteNit` (ej. `901222333-4`) | `idTerceroExterno` (ej. `2946`) | `GET /terceros/identificacion/{nit}`. |
| Vendedor responsable | `idTerceroInterno` | Config de la cuenta (`WORLDOFFICE_ID_TERCERO_INTERNO`). |
| Empresa | `idEmpresa` | Config (`WORLDOFFICE_ID_EMPRESA`). |
| Forma de pago / moneda / bodega / centro de costo | `idFormaPago` / `idMoneda` / `idBodega` / `idCentroCosto` | Config. |
| Prefijo del consecutivo | `prefijo` | Config (`WORLDOFFICE_PREFIJO`). |
| `descuentoPct` de la línea | `porDescuento` | Directo. |

**El punto crítico:** el **código contable** se conserva siempre (aunque el
vendedor busque por descripción) y es la llave para resolver el `idInventario`
correcto. Si un código no existe en World Office, el cliente live lo reporta sin
romper el flujo, para depurarlo.

### Cómo obtener los IDs de configuración (los que van en `.env`)

Estos IDs son propios de la cuenta y solo hay que conseguirlos **una vez**. Hay
dos caminos, de más fácil a más técnico:

**Opción A — Pedírselos a World Office (lo más fácil y rápido).**
Cuando entreguen el acceso Enterprise, escríbele al asesor o soporte de World
Office algo así:

> "Para conectar por API necesito los **IDs numéricos** de: empresa, tercero
> interno (el vendedor/responsable), forma de pago, moneda (COP), bodega, centro
> de costo, el **prefijo** del consecutivo, y los **códigos de tipo de
> documento** de factura y pedido."

Ellos los tienen a la mano porque configuraron la cuenta. Es cosa de minutos.

**Opción B — Leerlos del API con el token (para verificar o si no hay a quién
preguntar).** Con el token ya puesto, se consultan los servicios de listado
(GET) y cada uno devuelve el `id` junto al nombre:

| ID que necesitas | Cómo obtenerlo |
|---|---|
| `documentoTipo` (FV / PD) | `GET /documentosTipos` — lista los tipos con su código. |
| `idTerceroInterno` (vendedor interno) | Busca a esa persona como tercero: `GET /terceros/identificacion/{documento}` y toma su `id`. |
| `idEmpresa`, `idFormaPago`, `idMoneda`, `idBodega`, `idCentroCosto` | Con el servicio de listado del API correspondiente (empresas, formas de pago, monedas, bodegas, centros de costo): cada registro trae `id` + nombre. Si dudas del nombre exacto del servicio, usa la Opción A. |
| `prefijo` | Es el prefijo del consecutivo del tipo de documento; lo indica World Office (Opción A) o se ve en la configuración de numeración. |

> `idTerceroExterno` (el cliente) **no** va en `.env`: se resuelve solo en cada
> pedido con `GET /terceros/identificacion/{nit}`.

> **Recomendación:** el día que llegue el token, la vía más rápida es la Opción A
> (un mensaje a World Office). La Opción B sirve para confirmarlos.

Una vez tengas los valores, se cargan en `.env.local` (variables
`WORLDOFFICE_ID_*`, `WORLDOFFICE_PREFIJO`, `WORLDOFFICE_DOCTIPO_*`) y se pasa a
`WORLDOFFICE_MODE="live"`.

---

## 6. Flujo end-to-end en producción

1. El vendedor arma la cotización y pulsa **Generar pedido**.
2. La plataforma crea la orden y llama `crearPedido(orden)` →
   `POST /documentos` con el JSON de la sección 5.
3. World Office responde con el **id del documento**, que se guarda en la orden
   (`worldOfficeDocId`).
4. Se envía el **correo al área contable** (sección 8).
5. El contable revisa el pedido y pulsa **Convertir a factura** →
   `convertirEnFactura(orden)` crea la factura **cruzando** el pedido
   (`idFactura` = id del pedido en World Office).
6. El id de la factura queda asociado a la orden para trazabilidad.

El inventario que ve el vendedor se consulta con `consultarInventario(codigos)`
→ `GET /inventarios/{codigo}` por ítem, para mostrar disponibilidad **en vivo**.

---

## 7. Robustez: errores, idempotencia y reintentos

Toda la robustez de red vive en `src/worldoffice/http-wo.ts` (`HttpWorldOffice`),
que `cliente-live.ts` usa para **todas** sus llamadas. Ya está implementado:

- **Timeout:** cada petición se aborta con `AbortController` a los
  `WORLDOFFICE_TIMEOUT_MS` (def. 15 s) para que una llamada colgada no bloquee el
  pedido.
- **Reintentos con backoff:** ante errores transitorios (5xx, `429`, red/timeout)
  se reintenta con backoff exponencial (1 s, 3 s, 9 s), hasta
  `WORLDOFFICE_MAX_REINTENTOS` (def. 3). Los errores no transitorios (4xx) se
  propagan sin reintentar.
- **Rate limits:** si World Office responde `429`, se respeta la cabecera
  `Retry-After`.
- **Idempotencia:** World Office **no** ofrece un servicio para buscar un
  documento por referencia externa, así que la anti-duplicación se resuelve en la
  plataforma: al crear el pedido se guarda su `worldOfficeDocId` y no se vuelve a
  crear si ya lo tiene.
- **Pedido → factura sin duplicar:** `convertirEnFactura()` crea la factura con
  `POST /documentos` **cruzando** el pedido de origen (`idFactura` =
  `worldOfficeDocId` del pedido), en vez de duplicarlo.
- **Errores HTTP:** `cliente-live.ts` devuelve `ok:false` con código y cuerpo
  (`ErrorWorldOffice`) para mostrar/registrar el problema sin romper la app.
- **Registro:** cada envío guarda el `payloadEnviado` (en `ResultadoWorldOffice`)
  para auditoría.

---

## 8. Notificación por correo (Gmail API)

Cuando entra un pedido, el área contable recibe un correo (ver
`src/lib/notificaciones/`).

- **Demo:** `NotificadorConsola` imprime el correo en consola.
- **Producción:** `NotificadorGmail` envía vía Gmail con **OAuth2**.

Pasos para habilitar Gmail:

1. En Google Cloud Console, crear un proyecto y habilitar la **Gmail API**.
2. Crear credenciales **OAuth 2.0** (Client ID y Client Secret).
3. Autorizar la cuenta remitente de la empresa y obtener un **refresh token**
   con el scope `https://www.googleapis.com/auth/gmail.send`.
4. Cargar en variables de entorno: `GMAIL_SENDER`, `GMAIL_CLIENT_ID`,
   `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` y `NOTIFICACIONES_CONTABLE_TO`.

Con esas variables presentes, la app usa Gmail automáticamente; sin ellas, cae
al modo consola. No hay que tocar código.

---

## 9. Seguridad

- **Secretos solo en variables de entorno** (`.env.local`), nunca en el código
  ni en el repositorio. La plantilla es `.env.example`.
- El token de World Office y las credenciales de Gmail se tratan como
  contraseñas; se rotan si se filtran.
- Las llamadas al API solo se hacen **desde el servidor** (Server Actions / Route
  Handlers), nunca desde el navegador, para no exponer el token.

---

## 10. Checklist de activación (lo ejecuta el ganador)

- [ ] Obtener token de API de la cuenta World Office Enterprise del cliente.
- [ ] Confirmar rutas y esquema de autenticación reales.
- [ ] Ajustar `cliente-live.ts` y `payload.ts` según el mapeo confirmado.
- [ ] Cargar variables de entorno de World Office y Gmail en producción.
- [ ] Probar un pedido real de bajo monto y validar en World Office.
- [ ] Probar una factura real de bajo monto.
- [ ] Activar `WORLDOFFICE_MODE=live`.
- [ ] Verificar inventario en vivo y notificación por correo.

---

## 11. Supuestos y riesgos

- World Office **no tiene ambiente de pruebas público**: la validación final es
  contra la cuenta real, por eso se hace con documentos de bajo monto primero.
- Las rutas y nombres de campos exactos se confirman con la documentación
  Enterprise; el diseño aísla esos detalles en dos archivos para que el ajuste
  sea mínimo.
- La migración del catálogo de escritorio a World Office Cloud la realiza el
  propio equipo de World Office (≈ 1 día) y es responsabilidad del cliente.

---

## 12. Referencias

- Documentación de la API: <https://devapidoc.worldoffice.cloud/>
- Guía de uso e interfaz: <https://devapidoc.worldoffice.cloud/guiaInterfaz.html>
- Portal de desarrolladores: <https://developer.worldoffice.cloud/implementaciones.html>

Implementación en el repositorio:
- `src/worldoffice/contrato.ts` — interfaz que consume la app.
- `src/worldoffice/cliente-live.ts` — llamadas reales (endpoints, mapeo, idempotencia).
- `src/worldoffice/http-wo.ts` — transporte robusto (timeout, backoff, Retry-After).
- `src/worldoffice/mapeo-wo.ts` + `tipos-wo.ts` — cuerpo real de World Office.
- `src/worldoffice/payload.ts` — estructura neutra descargable.
