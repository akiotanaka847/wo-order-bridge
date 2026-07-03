import type { ReactNode } from "react";
import type { Orden } from "@/domain/tipos";
import { BadgeEstado } from "./BadgeEstado";
import { formatearFecha, formatearPesos } from "@/lib/formato";

interface Props {
  ordenes: Orden[];
  /** Muestra la columna de vendedor (paneles contable y admin). */
  mostrarVendedor?: boolean;
  /** Acción opcional por fila (ej. botón "Convertir a factura"). */
  accion?: (orden: Orden) => ReactNode;
  /** Texto cuando no hay órdenes. */
  vacio?: string;
}

/** Tabla de órdenes reutilizable por los tres paneles. */
export function TablaOrdenes({
  ordenes,
  mostrarVendedor = false,
  accion,
  vacio = "No hay órdenes todavía.",
}: Props) {
  if (ordenes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        {vacio}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Consecutivo</th>
            <th className="px-4 py-3">Cliente</th>
            {mostrarVendedor && <th className="px-4 py-3">Vendedor</th>}
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Fecha</th>
            {accion && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ordenes.map((o) => (
            <tr key={o.id} className="transition hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">
                {o.consecutivo}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">
                {o.clienteNombre}
              </td>
              {mostrarVendedor && (
                <td className="px-4 py-3 text-slate-600">{o.vendedorNombre}</td>
              )}
              <td className="px-4 py-3">
                <BadgeEstado estado={o.estado} />
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                {formatearPesos(o.total)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatearFecha(o.creadaEn)}
              </td>
              {accion && <td className="px-4 py-3 text-right">{accion(o)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
