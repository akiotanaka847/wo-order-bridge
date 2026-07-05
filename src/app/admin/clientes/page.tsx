import Link from "next/link";
import { Paginador } from "@/components/Paginador";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { leerPagina, paginar } from "@/lib/paginacion";

/** Gestión de clientes (terceros): listado con alta en página aparte. */
export default async function PaginaAdminClientes({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requerirRol("administrador");
  const { page } = await searchParams;
  const clientes = await obtenerRepositorio().listarClientes();
  const pagina = paginar(clientes, leerPagina(page));

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion={`${clientes.length} clientes. Los vendedores los eligen al cotizar.`}
        acciones={
          <Link
            href="/admin/clientes/nuevo"
            data-guia="nuevo-cliente"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            + Nuevo cliente
          </Link>
        }
      />

      <Tarjeta className="overflow-hidden" data-guia="tabla-clientes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre / Razón social</th>
                <th className="px-4 py-3">Identificación</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3 text-right">Descuento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagina.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Aún no hay clientes. Crea el primero con “+ Nuevo cliente”.
                  </td>
                </tr>
              ) : (
                pagina.items.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.nombre}</p>
                      {c.email && (
                        <p className="text-xs text-slate-400">{c.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                        {c.tipoIdentificacion ?? "NIT"}
                      </span>
                      {c.nit}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.ciudad ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.telefono ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {c.descuentoPct}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Paginador
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        total={pagina.total}
      />
    </div>
  );
}
