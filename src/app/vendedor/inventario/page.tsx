import { FiltrosInventario } from "@/components/FiltrosInventario";
import { Paginador } from "@/components/Paginador";
import { TablaInventario } from "@/components/TablaInventario";
import { EncabezadoPagina } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { leerPagina, paginar } from "@/lib/paginacion";
import { coincideTokens } from "@/lib/texto";

/**
 * Inventario para el vendedor: consulta de solo lectura del catálogo con stock.
 * La disponibilidad en vivo por código (World Office, GET /inventarios/{codigo})
 * se ve al cotizar; aquí se navega el catálogo completo.
 */
export default async function PaginaVendedorInventario({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}) {
  await requerirRol("vendedor");
  const { q, cat, page } = await searchParams;
  const productos = await obtenerRepositorio().listarProductos();

  const filtrados = productos.filter((p) => {
    const coincideCategoria = !cat || p.categoria === cat;
    return coincideTokens([p.descripcion, p.codigo], q ?? "") && coincideCategoria;
  });
  const pagina = paginar(filtrados, leerPagina(page));

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Inventario"
        descripcion={`${filtrados.length} de ${productos.length} productos. Consulta descripción, código y stock.`}
        acciones={
          <span data-guia="filtros-inventario">
            <FiltrosInventario />
          </span>
        }
      />

      <div data-guia="inventario-vendedor">
        <TablaInventario productos={pagina.items} />
      </div>
      <Paginador
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        total={pagina.total}
      />
    </div>
  );
}
