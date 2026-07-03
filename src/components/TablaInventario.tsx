import type { ReactNode } from "react";
import { ETIQUETAS_CATEGORIA } from "@/data/catalogo";
import type { CategoriaProducto, Producto } from "@/domain/tipos";
import { formatearPesos } from "@/lib/formato";
import { Tarjeta } from "./ui";

interface Props {
  productos: Producto[];
  /**
   * Celda de la columna Stock por fila. El admin pasa el editor de stock; el
   * vendedor (solo lectura) usa el valor por defecto (número). Si se omite,
   * muestra el stock como texto.
   */
  celdaStock?: (producto: Producto) => ReactNode;
  vacio?: string;
}

/**
 * Tabla de inventario reutilizable por el admin (editable) y el vendedor (solo
 * lectura). Mantiene un único diseño para no duplicar la tabla en cada panel.
 */
export function TablaInventario({
  productos,
  celdaStock,
  vacio = "Ningún producto coincide con el filtro.",
}: Props) {
  return (
    <Tarjeta className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {vacio}
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {p.codigo}
                  </td>
                  <td className="px-4 py-3 text-slate-800">{p.descripcion}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {ETIQUETAS_CATEGORIA[p.categoria as CategoriaProducto]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatearPesos(p.precio)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {celdaStock ? celdaStock(p) : p.stock}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
