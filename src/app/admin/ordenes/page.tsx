import { EnlaceEstructuraWO } from "@/components/EnlaceEstructuraWO";
import { EnlaceImprimir } from "@/components/EnlaceImprimir";
import { Paginador } from "@/components/Paginador";
import { TablaOrdenes } from "@/components/TablaOrdenes";
import { EncabezadoPagina } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { leerPagina, paginar } from "@/lib/paginacion";

/** Todas las órdenes creadas, de todos los vendedores. */
export default async function PaginaAdminOrdenes({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requerirRol("administrador");
  const { page } = await searchParams;
  const ordenes = await obtenerRepositorio().listarOrdenes();
  const pagina = paginar(ordenes, leerPagina(page));

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Órdenes"
        descripcion="Todas las cotizaciones, pedidos y facturas de la operación."
      />
      <div data-guia="tabla-ordenes">
        <TablaOrdenes
          ordenes={pagina.items}
          mostrarVendedor
          vacio="Aún no hay órdenes."
          accion={(o) => (
            <div className="flex items-center justify-end gap-3">
              <EnlaceImprimir ordenId={o.id} />
              <EnlaceEstructuraWO ordenId={o.id} />
            </div>
          )}
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
