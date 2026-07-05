import Link from "next/link";
import { EnlaceEstructuraWO } from "@/components/EnlaceEstructuraWO";
import { EnlaceImprimir } from "@/components/EnlaceImprimir";
import {
  IconoCarrito,
  IconoHistorial,
  IconoOrdenes,
} from "@/components/Iconos";
import { Paginador } from "@/components/Paginador";
import { TablaOrdenes } from "@/components/TablaOrdenes";
import { EncabezadoPagina, TarjetaEstadistica } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { formatearPesos } from "@/lib/formato";
import { leerPagina, paginar } from "@/lib/paginacion";
import { BotonConvertirPedido } from "../BotonConvertirPedido";

/** Historial + dashboard del propio vendedor. */
export default async function PaginaVendedorHistorial({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const vendedor = await requerirRol("vendedor");
  const { page } = await searchParams;
  const ordenes = await obtenerRepositorio().listarOrdenes({
    vendedorId: vendedor.id,
  });

  const cotizaciones = ordenes.filter((o) => o.estado === "cotizacion");
  const pedidos = ordenes.filter((o) => o.estado === "pedido");
  const facturados = ordenes.filter((o) => o.estado === "facturado");
  // Vendido = pedidos + facturados (lo efectivamente convertido en venta).
  const totalVendido = [...pedidos, ...facturados].reduce(
    (s, o) => s + o.total,
    0,
  );
  const pagina = paginar(ordenes, leerPagina(page));

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Mi historial"
        descripcion="Tus cotizaciones, pedidos y facturas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-guia="metricas-vendedor">
        <TarjetaEstadistica
          etiqueta="Cotizaciones"
          valor={cotizaciones.length}
          detalle="Sin convertir aún"
          icono={<IconoCarrito />}
        />
        <TarjetaEstadistica
          etiqueta="Pedidos"
          valor={pedidos.length}
          detalle="Enviados a World Office"
          icono={<IconoOrdenes />}
        />
        <TarjetaEstadistica
          etiqueta="Facturados"
          valor={facturados.length}
          detalle="Convertidos en factura"
          icono={<IconoHistorial />}
        />
        <TarjetaEstadistica
          etiqueta="Total vendido"
          valor={formatearPesos(totalVendido)}
          detalle="Pedidos + facturas"
          icono={<IconoOrdenes />}
        />
      </div>

      <section className="space-y-4" data-guia="historial-ordenes">
        <h2 className="text-lg font-semibold text-slate-900">Órdenes</h2>
        <TablaOrdenes
          ordenes={pagina.items}
          vacio="Aún no has creado órdenes."
          accion={(o) => (
            <div className="flex items-center justify-end gap-3">
              {o.estado === "cotizacion" && (
                <>
                  <Link
                    href={`/vendedor/editar/${o.id}`}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-700"
                  >
                    Editar
                  </Link>
                  <BotonConvertirPedido ordenId={o.id} />
                </>
              )}
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
      </section>
    </div>
  );
}
