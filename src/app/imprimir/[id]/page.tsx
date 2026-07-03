import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonImprimir } from "./BotonImprimir";
import { Logo } from "@/components/Logo";
import { NOMBRE_EMPRESA } from "@/config/app";
import type { EstadoOrden } from "@/domain/tipos";
import { obtenerUsuarioActual } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { formatearFecha, formatearPesos } from "@/lib/formato";

/** Título del documento según el estado de la orden. */
const TITULO_DOC: Record<EstadoOrden, string> = {
  cotizacion: "Cotización",
  pedido: "Pedido",
  facturado: "Factura",
};

/** Vista imprimible de una orden (cotización/pedido/factura) con marca. */
export default async function PaginaImprimirOrden({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");

  const { id } = await params;
  const orden = await obtenerRepositorio().obtenerOrden(id);
  if (!orden) redirect("/");

  // El vendedor solo imprime lo suyo; contable y admin, cualquier orden.
  if (usuario.rol === "vendedor" && orden.vendedorId !== usuario.id) {
    redirect("/vendedor/historial");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 text-slate-800 print:p-0">
      {/* Barra de acciones (no se imprime) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm text-slate-500 hover:text-brand-700">
          ← Volver
        </Link>
        <BotonImprimir />
      </div>

      {/* Encabezado con marca */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-auto" />
          <div>
            <p className="text-lg font-bold text-slate-900">{NOMBRE_EMPRESA}</p>
            <p className="text-sm text-slate-500">{TITULO_DOC[orden.estado]}</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-mono text-base font-semibold text-slate-900">
            {orden.consecutivo}
          </p>
          <p className="text-slate-500">{formatearFecha(orden.creadaEn)}</p>
        </div>
      </div>

      {/* Datos de cliente y vendedor */}
      <div className="grid grid-cols-2 gap-6 py-6 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cliente
          </p>
          <p className="font-medium text-slate-900">{orden.clienteNombre}</p>
          <p className="text-slate-500">NIT: {orden.clienteNit}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Vendedor
          </p>
          <p className="font-medium text-slate-900">{orden.vendedorNombre}</p>
        </div>
      </div>

      {/* Detalle de líneas */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2">Código</th>
            <th className="py-2 pr-2">Descripción</th>
            <th className="py-2 pr-2 text-right">Cant.</th>
            <th className="py-2 pr-2 text-right">V. unit.</th>
            <th className="py-2 pr-2 text-right">Desc.</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {orden.lineas.map((l) => (
            <tr key={l.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-2 font-mono text-xs text-slate-600">{l.codigo}</td>
              <td className="py-2 pr-2">{l.descripcion}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{l.cantidad}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {formatearPesos(l.precioUnitario)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{l.descuentoPct}%</td>
              <td className="py-2 text-right font-medium tabular-nums">
                {formatearPesos(l.totalLinea)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="mt-6 flex justify-end">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="tabular-nums">{formatearPesos(orden.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Descuento</dt>
            <dd className="tabular-nums">− {formatearPesos(orden.descuentoTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">IVA</dt>
            <dd className="tabular-nums">{formatearPesos(orden.iva)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatearPesos(orden.total)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        {TITULO_DOC[orden.estado]} {orden.consecutivo} · {NOMBRE_EMPRESA} ·
        Documento generado por la plataforma de cotizaciones y pedidos.
      </p>
    </div>
  );
}
