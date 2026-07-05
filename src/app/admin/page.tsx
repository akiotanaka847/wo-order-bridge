import Link from "next/link";
import {
  IconoInventario,
  IconoOrdenes,
  IconoUsuarios,
} from "@/components/Iconos";
import { GraficoAreaDiaria } from "@/components/GraficoAreaDiaria";
import { GraficoBarras } from "@/components/GraficoBarras";
import { TablaOrdenes } from "@/components/TablaOrdenes";
import {
  BarraDistribucion,
  EncabezadoPagina,
  Tarjeta,
  TarjetaEstadistica,
} from "@/components/ui";
import { ETIQUETAS_CATEGORIA } from "@/data/catalogo";
import type { CategoriaProducto } from "@/domain/tipos";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { formatearPesos } from "@/lib/formato";

/** Panel administrador: resumen general de la operación. */
export default async function PaginaAdminResumen() {
  await requerirRol("administrador");
  const repo = obtenerRepositorio();
  const [usuarios, productos, ordenes] = await Promise.all([
    repo.listarUsuarios(),
    repo.listarProductos(),
    repo.listarOrdenes(),
  ]);

  const vendedores = usuarios.filter((u) => u.rol === "vendedor").length;
  const contables = usuarios.filter((u) => u.rol === "contable").length;
  const cotizaciones = ordenes.filter((o) => o.estado === "cotizacion");
  const pedidos = ordenes.filter((o) => o.estado === "pedido");
  const facturados = ordenes.filter((o) => o.estado === "facturado");
  const totalFacturado = facturados.reduce((s, o) => s + o.total, 0);
  const recientes = ordenes.slice(0, 5);

  // "Vendido" = pedidos + facturados (lo efectivamente convertido en venta).
  const ventas = [...pedidos, ...facturados];

  // Ventas por vendedor (mayor a menor).
  const porVendedor = new Map<string, number>();
  for (const o of ventas)
    porVendedor.set(o.vendedorNombre, (porVendedor.get(o.vendedorNombre) ?? 0) + o.total);
  const ventasPorVendedor = [...porVendedor.entries()]
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort((a, b) => b.valor - a.valor);

  // Ventas por día (últimos 30 días) — gráfico tipo bursátil.
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dosDig = (x: number) => String(x).padStart(2, "0");
  const hoy = new Date();
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (29 - i));
    const clave = `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`;
    return { clave, etiqueta: `${d.getDate()} ${MESES[d.getMonth()]}` };
  });
  const porDia = new Map<string, number>();
  for (const o of ventas)
    porDia.set(o.creadaEn.slice(0, 10), (porDia.get(o.creadaEn.slice(0, 10)) ?? 0) + o.total);
  const ventasDiarias = dias.map((d) => ({
    etiqueta: d.etiqueta,
    valor: porDia.get(d.clave) ?? 0,
  }));
  const totalMes = ventasDiarias.reduce((s, d) => s + d.valor, 0);

  // Top 5 productos por venta (sobre pedidos + facturas).
  const porProducto = new Map<string, { desc: string; valor: number }>();
  for (const o of ventas)
    for (const l of o.lineas) {
      const acum = porProducto.get(l.codigo) ?? { desc: l.descripcion, valor: 0 };
      acum.valor += l.totalLinea;
      porProducto.set(l.codigo, acum);
    }
  const topProductos = [...porProducto.values()]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)
    .map((p) => ({ etiqueta: p.desc, valor: p.valor }));

  // Inventario por categoría (clasificación de World Office).
  const categorias = Object.entries(ETIQUETAS_CATEGORIA) as [
    CategoriaProducto,
    string,
  ][];
  const porCategoria = categorias.map(([valor, etiqueta]) => ({
    etiqueta,
    valor: productos.filter((p) => p.categoria === valor).length,
  }));

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Resumen"
        descripcion="Vista general de usuarios, inventario y órdenes."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-guia="metricas-admin">
        <TarjetaEstadistica
          etiqueta="Usuarios"
          valor={usuarios.length}
          detalle={`${vendedores} vendedores · ${contables} contables`}
          icono={<IconoUsuarios />}
        />
        <TarjetaEstadistica
          etiqueta="Productos"
          valor={productos.length}
          detalle="En el catálogo"
          icono={<IconoInventario />}
        />
        <TarjetaEstadistica
          etiqueta="Pedidos por facturar"
          valor={pedidos.length}
          detalle="En estado pedido"
          icono={<IconoOrdenes />}
        />
        <TarjetaEstadistica
          etiqueta="Facturado"
          valor={formatearPesos(totalFacturado)}
          detalle={`${facturados.length} órdenes facturadas`}
          icono={<IconoOrdenes />}
        />
      </div>

      <Tarjeta className="p-5" data-guia="grafico-ventas">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Ventas del último mes
          </h3>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total últimos 30 días</p>
            <p className="text-xl font-bold tracking-tight text-slate-900">
              {formatearPesos(totalMes)}
            </p>
          </div>
        </div>
        <GraficoAreaDiaria datos={ventasDiarias} />
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2" data-guia="ventas-y-top">
        <Tarjeta className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Ventas por vendedor
          </h3>
          <GraficoBarras
            datos={ventasPorVendedor}
            formato={formatearPesos}
            vacio="Aún no hay ventas."
          />
        </Tarjeta>
        <Tarjeta className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Top 5 productos por venta
          </h3>
          <GraficoBarras
            datos={topProductos}
            formato={formatearPesos}
            vacio="Aún no hay ventas."
          />
        </Tarjeta>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-guia="distribuciones">
        <Tarjeta className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Órdenes por estado
          </h3>
          <div className="space-y-3">
            <BarraDistribucion
              etiqueta="Cotizaciones"
              valor={cotizaciones.length}
              total={ordenes.length}
            />
            <BarraDistribucion
              etiqueta="Pedidos"
              valor={pedidos.length}
              total={ordenes.length}
            />
            <BarraDistribucion
              etiqueta="Facturados"
              valor={facturados.length}
              total={ordenes.length}
            />
          </div>
        </Tarjeta>

        <Tarjeta className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Inventario por categoría
          </h3>
          <div className="space-y-3">
            {porCategoria.map((c) => (
              <BarraDistribucion
                key={c.etiqueta}
                etiqueta={c.etiqueta}
                valor={c.valor}
                total={productos.length}
                sufijo="prod."
              />
            ))}
          </div>
        </Tarjeta>
      </div>

      <section className="space-y-4" data-guia="ordenes-recientes">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Órdenes recientes
          </h2>
          <Link
            href="/admin/ordenes"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Ver todas →
          </Link>
        </div>
        <TablaOrdenes
          ordenes={recientes}
          mostrarVendedor
          vacio="Aún no hay órdenes."
        />
      </section>

      <div className="grid gap-4 sm:grid-cols-2" data-guia="accesos-rapidos">
        <Link href="/admin/usuarios">
          <Tarjeta className="p-5 transition hover:border-brand-300 hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
                <IconoUsuarios />
              </span>
              <div>
                <p className="font-medium text-slate-900">Gestionar usuarios</p>
                <p className="text-sm text-slate-500">
                  Crear y eliminar vendedores y contables.
                </p>
              </div>
            </div>
          </Tarjeta>
        </Link>
        <Link href="/admin/inventario">
          <Tarjeta className="p-5 transition hover:border-brand-300 hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
                <IconoInventario />
              </span>
              <div>
                <p className="font-medium text-slate-900">Gestionar inventario</p>
                <p className="text-sm text-slate-500">
                  Ajustar el stock de cada producto.
                </p>
              </div>
            </div>
          </Tarjeta>
        </Link>
      </div>
    </div>
  );
}
