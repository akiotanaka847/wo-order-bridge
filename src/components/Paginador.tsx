"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Control de paginación reutilizable. Escribe la página en el query param
 * `page` (conservando los demás filtros), que la página del servidor lee para
 * cortar la lista. No se muestra si solo hay una página.
 */
export function Paginador({
  pagina,
  totalPaginas,
  total,
}: {
  pagina: number;
  totalPaginas: number;
  /** Total de elementos, para el texto "N en total" (opcional). */
  total?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPaginas <= 1) return null;

  function irA(destino: number) {
    const nuevos = new URLSearchParams(params);
    if (destino <= 1) nuevos.delete("page");
    else nuevos.set("page", String(destino));
    const query = nuevos.toString();
    router.push((query ? `${pathname}?${query}` : pathname) as Route);
  }

  const claseBoton =
    "rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2 text-sm text-slate-500">
      <span>
        Página {pagina} de {totalPaginas}
        {typeof total === "number" ? ` · ${total} en total` : ""}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => irA(pagina - 1)}
          disabled={pagina <= 1}
          className={claseBoton}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => irA(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className={claseBoton}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
