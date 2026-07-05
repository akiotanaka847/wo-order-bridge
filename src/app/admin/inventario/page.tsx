import Link from "next/link";
import { FiltrosInventario } from "@/components/FiltrosInventario";
import { Paginador } from "@/components/Paginador";
import { TablaInventario } from "@/components/TablaInventario";
import { EncabezadoPagina } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { leerPagina, paginar } from "@/lib/paginacion";
import { coincideTokens } from "@/lib/texto";
import { EditorStock } from "../EditorStock";

/** Gestión de inventario: buscar, filtrar por categoría y ajustar el stock. */
export default async function PaginaAdminInventario({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}) {
  await requerirRol("administrador");
  const { q, cat, page } = await searchParams;
  const productos = await obtenerRepositorio().listarProductos();

  // Filtrado: búsqueda por palabras (Y) sobre descripción/código + categoría.
  const filtrados = productos.filter((p) => {
    const coincideCategoria = !cat || p.categoria === cat;
    return coincideTokens([p.descripcion, p.codigo], q ?? "") && coincideCategoria;
  });
  const pagina = paginar(filtrados, leerPagina(page));

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Inventario"
        descripcion={`${filtrados.length} de ${productos.length} productos. Busca, filtra por categoría y ajusta el stock.`}
        acciones={
          <>
            <span data-guia="filtros-inventario">
              <FiltrosInventario />
            </span>
            <Link
              href="/admin/inventario/nuevo"
              data-guia="nuevo-producto"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              + Nuevo producto
            </Link>
          </>
        }
      />

      <div data-guia="tabla-inventario">
        <TablaInventario
          productos={pagina.items}
          celdaStock={(p) => <EditorStock productoId={p.id} stockActual={p.stock} />}
        />
      </div>
      <Paginador
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        total={pagina.total}
      />
    </div>
  );
}
