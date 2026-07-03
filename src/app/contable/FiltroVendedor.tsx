"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Usuario } from "@/domain/tipos";

/** Filtro por vendedor: actualiza el query param y recarga la lista actual. */
export function FiltroVendedor({ vendedores }: { vendedores: Usuario[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const actual = params.get("vendedor") ?? "";

  function cambiar(vendedorId: string) {
    const nuevos = new URLSearchParams(params);
    if (vendedorId) nuevos.set("vendedor", vendedorId);
    else nuevos.delete("vendedor");
    nuevos.delete("page"); // al cambiar el filtro, vuelve a la primera página
    const query = nuevos.toString();
    router.push((query ? `${pathname}?${query}` : pathname) as Route);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Vendedor:
      <select
        value={actual}
        onChange={(e) => cambiar(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Todos</option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
