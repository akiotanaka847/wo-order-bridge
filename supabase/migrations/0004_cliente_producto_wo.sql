-- ============================================================================
--  Migración 0004 — Campos de World Office para clientes (terceros) y productos
--  (inventarios). Amplía las tablas para poder crear terceros e inventarios
--  completos desde el panel del administrador. Ejecutar en el SQL Editor.
--  La escritura ya está restringida al administrador por RLS (migración 0002).
-- ============================================================================

-- --- Clientes (terceros) ------------------------------------------------------
alter table clientes
  add column if not exists tipo_identificacion       text    not null default 'NIT',
  add column if not exists digito_verificacion        text,
  add column if not exists tipo_persona               text    not null default 'juridica',
  add column if not exists primer_nombre              text,
  add column if not exists segundo_nombre             text,
  add column if not exists primer_apellido            text,
  add column if not exists segundo_apellido           text,
  add column if not exists telefono                   text,
  add column if not exists direccion                  text,
  add column if not exists ciudad                     text,
  add column if not exists es_cliente                 boolean not null default true,
  add column if not exists es_proveedor               boolean not null default false,
  add column if not exists clasificacion              text,
  add column if not exists zona                       text,
  add column if not exists plazo_dias                 integer,
  add column if not exists cupo_credito               numeric(14,2),
  add column if not exists lista_precios              text,
  add column if not exists tipo_contribuyente         text,
  add column if not exists clasificacion_dian         text,
  add column if not exists responsabilidades_fiscales text,
  add column if not exists activo                     boolean not null default true;

-- --- Productos (inventarios) --------------------------------------------------
alter table productos
  add column if not exists grupo             text,
  add column if not exists tipo              text    not null default 'producto',
  add column if not exists maneja_inventario boolean not null default true,
  add column if not exists cuenta_venta      text,
  add column if not exists cuenta_compra     text;
