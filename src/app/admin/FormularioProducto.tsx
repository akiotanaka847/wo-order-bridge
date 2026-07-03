"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ETIQUETAS_CATEGORIA } from "@/data/catalogo";
import type { CategoriaProducto } from "@/domain/tipos";
import { crearProductoAccion, type EstadoForm } from "./acciones";

const INICIAL: EstadoForm = {};

const input =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const label = "flex flex-col gap-1 text-sm text-slate-600";

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

/** Formulario para crear un producto (inventario) con los campos de World Office. */
export function FormularioProducto() {
  const [estado, accion, enviando] = useActionState(crearProductoAccion, INICIAL);
  const categorias = Object.entries(ETIQUETAS_CATEGORIA) as [CategoriaProducto, string][];

  return (
    <form action={accion} className="space-y-4">
      <Grupo titulo="General">
        <label className={label}>
          Código contable *
          <input name="codigo" required className={input} />
        </label>
        <label className={label}>
          Tipo
          <select name="tipo" defaultValue="producto" className={input}>
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Descripción *
          <input name="descripcion" required className={input} />
        </label>
        <label className={label}>
          Marca
          <input name="marca" className={input} />
        </label>
        <label className={label}>
          Unidad de medida
          <input name="unidad" defaultValue="UND" className={input} />
        </label>
      </Grupo>

      <Grupo titulo="Clasificación">
        <label className={label}>
          Clasificación (categoría)
          <select name="categoria" defaultValue={categorias[0]?.[0]} className={input}>
            {categorias.map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Grupo
          <input name="grupo" className={input} />
        </label>
      </Grupo>

      <Grupo titulo="Precios e impuestos">
        <label className={label}>
          Precio (sin IVA)
          <input name="precio" type="number" min={0} defaultValue={0} className={input} />
        </label>
        <label className={label}>
          IVA (%)
          <input name="ivaPct" type="number" min={0} max={100} defaultValue={19} className={input} />
        </label>
        <label className={label}>
          Stock inicial
          <input name="stock" type="number" min={0} defaultValue={0} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input name="manejaInventario" type="checkbox" defaultChecked /> Maneja inventario
        </label>
      </Grupo>

      <Grupo titulo="Cuentas contables">
        <label className={label}>
          Cuenta de venta
          <input name="cuentaVenta" className={input} />
        </label>
        <label className={label}>
          Cuenta de compra
          <input name="cuentaCompra" className={input} />
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
          <Link href="/admin/inventario" className="font-medium underline underline-offset-2 hover:text-emerald-900">
            Ver inventario →
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
      >
        {enviando ? "Creando…" : "Crear producto"}
      </button>
    </form>
  );
}
