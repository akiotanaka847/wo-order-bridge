"use client";

import Link from "next/link";
import { useActionState } from "react";
import { crearClienteAccion, type EstadoForm } from "./acciones";

const INICIAL: EstadoForm = {};

const input =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const label = "flex flex-col gap-1 text-sm text-slate-600";

/** Sección con título dentro del formulario. */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Formulario completo para crear un cliente (tercero) con los campos de World Office. */
export function FormularioCliente() {
  const [estado, accion, enviando] = useActionState(crearClienteAccion, INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <Grupo titulo="Identificación">
        <label className={label}>
          Tipo de identificación
          <select name="tipoIdentificacion" defaultValue="NIT" className={input}>
            <option value="NIT">NIT</option>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="TI">Tarjeta de identidad</option>
          </select>
        </label>
        <label className={label}>
          Número de identificación *
          <input name="nit" required className={input} />
        </label>
        <label className={label}>
          Dígito de verificación
          <input name="digitoVerificacion" className={input} />
        </label>
        <label className={label}>
          Tipo de persona
          <select name="tipoPersona" defaultValue="juridica" className={input}>
            <option value="juridica">Jurídica</option>
            <option value="natural">Natural</option>
          </select>
        </label>
      </Grupo>

      <Grupo titulo="Nombre / Razón social">
        <label className={`${label} sm:col-span-2`}>
          Nombre o razón social *
          <input name="nombre" required className={input} />
        </label>
        <label className={label}>
          Primer nombre
          <input name="primerNombre" className={input} />
        </label>
        <label className={label}>
          Segundo nombre
          <input name="segundoNombre" className={input} />
        </label>
        <label className={label}>
          Primer apellido
          <input name="primerApellido" className={input} />
        </label>
        <label className={label}>
          Segundo apellido
          <input name="segundoApellido" className={input} />
        </label>
      </Grupo>

      <Grupo titulo="Contacto">
        <label className={label}>
          Correo
          <input name="email" type="email" className={input} />
        </label>
        <label className={label}>
          Teléfono
          <input name="telefono" className={input} />
        </label>
        <label className={label}>
          Dirección
          <input name="direccion" className={input} />
        </label>
        <label className={label}>
          Ciudad
          <input name="ciudad" className={input} />
        </label>
      </Grupo>

      <Grupo titulo="Comercial">
        <label className={label}>
          Descuento (%)
          <input name="descuentoPct" type="number" min={0} max={100} defaultValue={0} className={input} />
        </label>
        <label className={label}>
          Clasificación
          <input name="clasificacion" className={input} />
        </label>
        <label className={label}>
          Zona
          <input name="zona" className={input} />
        </label>
        <label className={label}>
          Lista de precios
          <input name="listaPrecios" className={input} />
        </label>
        <label className={label}>
          Plazo (días)
          <input name="plazoDias" type="number" min={0} className={input} />
        </label>
        <label className={label}>
          Cupo de crédito
          <input name="cupoCredito" type="number" min={0} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input name="esCliente" type="checkbox" defaultChecked /> Es cliente
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input name="esProveedor" type="checkbox" /> Es proveedor
        </label>
      </Grupo>

      <Grupo titulo="Fiscal">
        <label className={label}>
          Tipo de contribuyente
          <input name="tipoContribuyente" className={input} />
        </label>
        <label className={label}>
          Clasificación DIAN
          <input name="clasificacionDian" className={input} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Responsabilidades fiscales
          <input name="responsabilidadesFiscales" className={input} />
        </label>
      </Grupo>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input name="activo" type="checkbox" defaultChecked /> Activo
      </label>

      {estado.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{estado.error}</p>
      )}
      {estado.ok && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span>{estado.ok}</span>
          <Link href="/admin/clientes" className="font-medium underline underline-offset-2 hover:text-emerald-900">
            Ver clientes →
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
      >
        {enviando ? "Creando…" : "Crear cliente"}
      </button>
    </form>
  );
}
