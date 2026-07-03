import { AutoActualizar } from "@/components/AutoActualizar";
import { EnlaceEstructuraWO } from "@/components/EnlaceEstructuraWO";
import { EnlaceImprimir } from "@/components/EnlaceImprimir";
import { IconoHistorial, IconoOrdenes } from "@/components/Iconos";
import { Paginador } from "@/components/Paginador";
import { TablaOrdenes } from "@/components/TablaOrdenes";
import { EncabezadoPagina, TarjetaEstadistica } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { formatearPesos } from "@/lib/formato";
import { leerPagina, paginar } from "@/lib/paginacion";
import { BotonFacturar } from "./BotonFacturar";
import { FiltroVendedor } from "./FiltroVendedor";

/** Panel contable: dashboard + pedidos por facturar, en tiempo real y filtrables. */
export default async function PaginaContable({
  searchParams,
}: {
  searchParams: Promise<{ vendedor?: string; page?: string }>;
}) {
  await requerirRol("contable");
  const { vendedor, page } = await searchParams;
  const repo = obtenerRepositorio();

  const [todas, usuarios] = await Promise.all([
    repo.listarOrdenes(),
    repo.listarUsuarios(),
  ]);
  const vendedores = usuarios.filter((u) => u.rol === "vendedor");
  // Los pedidos filtrados se derivan de la misma lista: una consulta menos.
  const filtradas = todas.filter(
    (o) => o.estado === "pedido" && (!vendedor || o.vendedorId === vendedor),
  );
  const pagina = paginar(filtradas, leerPagina(page));

  // Métricas del dashboard (sobre todas las órdenes, sin el filtro de vendedor).
  const pedidos = todas.filter((o) => o.estado === "pedido");
  const facturados = todas.filter((o) => o.estado === "facturado");
  const porFacturar = pedidos.reduce((s, o) => s + o.total, 0);
  const totalFacturado = facturados.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-8">
      <AutoActualizar />
      <EncabezadoPagina
        titulo="Panel contable"
        descripcion="Pedidos listos para convertir en factura dentro de World Office."
        acciones={
          <>
            <a
              href="/api/worldoffice/estructuras"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-700"
            >
              Descargar estructuras (lote)
            </a>
            <FiltroVendedor vendedores={vendedores} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaEstadistica
          etiqueta="Pedidos por facturar"
          valor={pedidos.length}
          detalle="Esperando conversión"
          icono={<IconoOrdenes />}
        />
        <TarjetaEstadistica
          etiqueta="Monto por facturar"
          valor={formatearPesos(porFacturar)}
          detalle="Suma de pedidos pendientes"
          icono={<IconoOrdenes />}
        />
        <TarjetaEstadistica
          etiqueta="Facturados"
          valor={facturados.length}
          detalle="Convertidos en World Office"
          icono={<IconoHistorial />}
        />
        <TarjetaEstadistica
          etiqueta="Total facturado"
          valor={formatearPesos(totalFacturado)}
          detalle="Acumulado"
          icono={<IconoHistorial />}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Pedidos en tiempo real
        </h2>
        <TablaOrdenes
          ordenes={pagina.items}
          mostrarVendedor
          vacio="No hay pedidos por facturar."
          accion={(o) => (
            <div className="flex items-center justify-end gap-3">
              <EnlaceImprimir ordenId={o.id} />
              <EnlaceEstructuraWO ordenId={o.id} />
              <BotonFacturar ordenId={o.id} />
            </div>
          )}
        />
        <Paginador
          pagina={pagina.pagina}
          totalPaginas={pagina.totalPaginas}
          total={pagina.total}
        />
      </section>
    </div>
  );
}
