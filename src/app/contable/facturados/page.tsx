import { EnlaceEstructuraWO } from "@/components/EnlaceEstructuraWO";
import { EnlaceImprimir } from "@/components/EnlaceImprimir";
import { Paginador } from "@/components/Paginador";
import { TablaOrdenes } from "@/components/TablaOrdenes";
import { EncabezadoPagina } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { leerPagina, paginar } from "@/lib/paginacion";
import { FiltroVendedor } from "../FiltroVendedor";

/** Historial de pedidos ya convertidos en factura. */
export default async function PaginaContableFacturados({
  searchParams,
}: {
  searchParams: Promise<{ vendedor?: string; page?: string }>;
}) {
  await requerirRol("contable");
  const { vendedor, page } = await searchParams;
  const repo = obtenerRepositorio();

  const [ordenes, usuarios] = await Promise.all([
    repo.listarOrdenes({ vendedorId: vendedor || undefined, estado: "facturado" }),
    repo.listarUsuarios(),
  ]);
  const vendedores = usuarios.filter((u) => u.rol === "vendedor");
  const pagina = paginar(ordenes, leerPagina(page));

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Facturados"
        descripcion="Pedidos ya convertidos en factura en World Office."
        acciones={<FiltroVendedor vendedores={vendedores} />}
      />
      <TablaOrdenes
        ordenes={pagina.items}
        mostrarVendedor
        vacio="Aún no hay pedidos facturados."
        accion={(o) => (
          <div className="flex items-center justify-end gap-3">
            <EnlaceImprimir ordenId={o.id} />
            <EnlaceEstructuraWO ordenId={o.id} />
          </div>
        )}
      />
      <Paginador
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        total={pagina.total}
      />
    </div>
  );
}
