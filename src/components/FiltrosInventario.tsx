"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ETIQUETAS_CATEGORIA } from "@/data/catalogo";
import type { CategoriaProducto } from "@/domain/tipos";

/**
 * Filtros del inventario: búsqueda por descripción o código y filtro por
 * categoría (la "clasificación de inventario" de World Office). Escriben en los
 * query params `q` y `cat`, que la página lee para filtrar en el servidor.
 * Reutilizable por el panel admin (editable) y el del vendedor (solo lectura).
 */
export function FiltrosInventario() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [texto, setTexto] = useState(params.get("q") ?? "");
  const categoria = params.get("cat") ?? "";
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Actualiza un query param y navega (conservando los demás, salvo la página). */
  function fijar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    nuevos.delete("page"); // al cambiar el filtro, vuelve a la primera página
    const query = nuevos.toString();
    router.push((query ? `${pathname}?${query}` : pathname) as Route);
  }

  // Búsqueda con debounce para no navegar en cada tecla.
  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      if (texto !== (params.get("q") ?? "")) fijar("q", texto);
    }, 300);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const categorias = Object.entries(ETIQUETAS_CATEGORIA) as [
    CategoriaProducto,
    string,
  ][];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por descripción o código…"
        className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-64"
      />
      <select
        value={categoria}
        onChange={(e) => fijar("cat", e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Todas las categorías</option>
        {categorias.map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
