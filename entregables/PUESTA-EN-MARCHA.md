# Puesta en marcha en producción — checklist

Guía única para dejar la plataforma **funcionando de verdad**: login real, base de
datos, conexión con World Office, correo y publicación. Marca cada casilla al
completarla.

Documentos de apoyo:
- `SETUP-SUPABASE.md` — detalle de base de datos y login.
- `INTEGRACION-WORLD-OFFICE.md` — detalle técnico de la API.
- `DOCUMENTACION-COMPLETA.md` — cómo funciona todo y todas las variables.

> **Importante:** el **login** y **World Office** son cosas separadas.
> El login es propio de la plataforma (Supabase Auth, correo + contraseña).
> World Office recibe los pedidos por API con **un solo token del servidor**,
> no con la cuenta de cada persona.

---

## Resumen de los dos "modos"

| | Demo (hoy) | Producción |
|---|---|---|
| Datos | En memoria (se pierden al reiniciar) | Supabase (Postgres) |
| Login | Cookie + usuarios de prueba | Supabase Auth (correo + contraseña) |
| World Office | Mock (simulado) | API real (`WORLDOFFICE_MODE=live`) |
| Correo | Consola | Gmail |

Se cambia de uno a otro **solo con variables de entorno**, sin tocar el código.

---

## 1. Login real + base de datos (Supabase)

- [ ] Crear un proyecto en <https://supabase.com>.
- [ ] En **Project Settings → API**, copiar `Project URL`, `anon key` y
      `service_role key`.
- [ ] En el **SQL Editor**, ejecutar en orden:
  - [ ] `supabase/migrations/0001_inicial.sql`
  - [ ] `supabase/migrations/0002_rls.sql`
  - [ ] `supabase/migrations/0003_consecutivo.sql`
- [ ] Copiar `.env.example` a `.env.local` y completar:
  ```env
  DATA_MODE="supabase"
  NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="…"
  SUPABASE_SERVICE_ROLE_KEY="…"
  SEED_ADMIN_EMAIL="admin@emcompania.com"
  SEED_ADMIN_PASSWORD="una-clave-fuerte"
  SEED_ADMIN_NOMBRE="Administrador"
  ```
- [ ] Ejecutar `npm run seed:supabase` (crea el **primer administrador** + siembra
      catálogo y clientes).
- [ ] Entrar en `/login` con el correo y contraseña del administrador.

### Dar acceso al equipo
- [ ] Desde el panel **Admin → Usuarios → Crear usuario**: nombre, correo, rol
      (vendedor o contable) y contraseña inicial.
- [ ] Entregar a cada persona su correo y contraseña.
- [ ] (Opcional) Para que cada usuario fije su propia clave por correo de
      invitación: configurar SMTP en Supabase (Authentication → Email) y usar
      `inviteUserByEmail` en `crearUsuario` (ver `SETUP-SUPABASE.md`).

> La plataforma es **cerrada**: nadie se registra solo. El acceso se da y se quita
> desde el panel admin. RLS garantiza que cada rol vea solo lo suyo.

---

## 2. Conexión con World Office (API real)

### 2.1 Credenciales y datos de la cuenta (los aporta E.M. con su plan Enterprise)
- [ ] **Token de API**: World Office → Configuración → Configuración General →
      sección **API** → copiar el token JWT. → `WORLDOFFICE_API_TOKEN`.
      (Dura 12 h; si expira se regenera en el mismo lugar.)
- [ ] Anotar los **IDs numéricos** de la cuenta (con el token, vía los GET de la
      API, o pedírselos a World Office):
  - [ ] `WORLDOFFICE_ID_EMPRESA` (empresa)
  - [ ] `WORLDOFFICE_ID_TERCERO_INTERNO` (vendedor/responsable interno)
  - [ ] `WORLDOFFICE_ID_FORMA_PAGO`
  - [ ] `WORLDOFFICE_ID_MONEDA` (COP)
  - [ ] `WORLDOFFICE_ID_BODEGA`
  - [ ] `WORLDOFFICE_ID_CENTRO_COSTO`
  - [ ] `WORLDOFFICE_PREFIJO` (prefijo del consecutivo)
  - [ ] Confirmar códigos de tipo de documento con `GET /documentosTipos`:
        `WORLDOFFICE_DOCTIPO_FACTURA` (FV) y `WORLDOFFICE_DOCTIPO_PEDIDO` (PD).

### 2.2 Verificar 2 respuestas reales y ajustar si difieren
- [ ] `GET /inventarios/{codigo}`: confirmar el nombre del campo de
      disponibilidad (`disponible` / `saldo` / `cantidad`). El código ya lee los
      tres; si es otro, agregarlo en `disponibleDe()` de `cliente-live.ts`.
- [ ] `GET /terceros/identificacion/{nit}`: confirmar que devuelve `id`. Si viene
      anidado, ajustar `resolverTercero()`.

> Si alguna **ruta** difiere, se cambia por variable `WORLDOFFICE_RUTA_*` sin
> tocar el código (defaults en `RUTAS_WO_DEFECTO`, `cliente-live.ts`).

### 2.3 Que los datos existan en World Office
- [ ] **Catálogo real** cargado en World Office (la migración de escritorio a la
      nube la hace el equipo de World Office, ~1 día). Cada producto debe
      conservar su **código contable** (es la llave que usa la plataforma).
- [ ] **Clientes (terceros)** creados en World Office con su **NIT** (el pedido
      resuelve el cliente por NIT).

### 2.4 Encender el modo live
- [ ] En `.env.local`:
  ```env
  WORLDOFFICE_MODE="live"
  WORLDOFFICE_API_BASE_URL="https://api.worldoffice.cloud/api/v1"
  WORLDOFFICE_API_TOKEN="…"
  WORLDOFFICE_ID_EMPRESA="…"
  WORLDOFFICE_ID_TERCERO_INTERNO="…"
  WORLDOFFICE_ID_FORMA_PAGO="…"
  WORLDOFFICE_ID_MONEDA="…"
  WORLDOFFICE_ID_BODEGA="…"
  WORLDOFFICE_ID_CENTRO_COSTO="…"
  WORLDOFFICE_PREFIJO="…"
  WORLDOFFICE_DOCTIPO_FACTURA="FV"
  WORLDOFFICE_DOCTIPO_PEDIDO="PD"
  ```

### 2.5 Probar (World Office no tiene ambiente de pruebas: usar la cuenta real, monto bajo)
- [ ] Generar **un pedido de bajo monto** desde el panel del vendedor.
- [ ] Verificar en World Office con `GET /documentos/getDocumentoId/{id}`.
- [ ] **Convertir a factura** desde el panel contable y verificar la factura.

### 2.6 Último ajuste de código (solo posible con la cuenta real)
- [ ] La factura **cruza** el pedido (`idFactura`). Para descargarlo renglón por
      renglón, World Office pide `idDetalles` (ids de los renglones del pedido),
      que se obtienen con `GET /documentos/getRenglonesByDocumentoEncabezado/{idPedido}`.
      Completar esa resolución en `cliente-live.ts` una vez se vea la forma real
      de esa respuesta.

---

## 3. Correo al área contable (Gmail)

- [ ] En Google Cloud Console: crear proyecto y habilitar la **Gmail API**.
- [ ] Crear credenciales **OAuth 2.0** (Client ID y Client Secret).
- [ ] Obtener un **refresh token** con el scope `gmail.send` para la cuenta
      remitente.
- [ ] En `.env.local`:
  ```env
  GMAIL_SENDER="notificaciones@emcompania.com"
  GMAIL_CLIENT_ID="…"
  GMAIL_CLIENT_SECRET="…"
  GMAIL_REFRESH_TOKEN="…"
  NOTIFICACIONES_CONTABLE_TO="contabilidad@emcompania.com"
  ```

> Si faltan estas credenciales, el correo cae a consola automáticamente (no
> rompe nada).

---

## 4. Marca (opcional, ya configurada para E.M.)

- [ ] Logo: reemplazar `public/marca/logo.png` y `src/app/icon.png` si cambia.
- [ ] Colores: ajustar los tokens `--color-brand-*` en `src/app/globals.css`.
- [ ] Nombre en la interfaz: `NEXT_PUBLIC_EMPRESA_NOMBRE` y
      `NEXT_PUBLIC_APP_NAME` (o los valores por defecto en `src/config/app.ts`).

---

## 5. Publicar (hosting)

- [ ] Subir el repositorio a **Vercel** (u otro host de Next.js).
- [ ] Cargar en el proyecto de Vercel **todas** las variables de `.env.local`
      (Supabase, World Office, Gmail, marca) y `APP_BASE_URL` con el dominio real.
- [ ] Verificar el flujo completo en el dominio: login → cotizar → pedido →
      correo → factura.

---

## 6. Verificación final (checklist rápido)

- [ ] Inicio de sesión por rol funciona (admin, contable, vendedor).
- [ ] El vendedor busca por descripción y por código; ve inventario en vivo.
- [ ] Cotización con descuento del cliente → pedido → entra en World Office.
- [ ] El contable recibe el correo y convierte el pedido en factura.
- [ ] El administrador crea/elimina usuarios y ajusta inventario.
- [ ] `npm run typecheck` sin errores; `npm run build` exitoso.

---

**Qué está listo y qué falta.** El código está completo para producción; lo que
resta **solo se puede hacer con la cuenta real de World Office**: token + IDs,
confirmar 2 formas de respuesta, que catálogo y clientes existan en World Office,
y el `idDetalles` de la factura. Es exactamente el 10% que el concurso reserva al
ganador, ya con contrato y accesos.
