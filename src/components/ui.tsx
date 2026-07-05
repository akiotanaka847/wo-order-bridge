/**
 * Primitivas de interfaz reutilizables, para un look consistente en todos los
 * paneles sin repetir clases. Si un patrón visual se usa más de una vez, vive
 * aquí.
 */

import type { ReactNode } from "react";

/** Tarjeta contenedora con borde suave y fondo blanco. */
export function Tarjeta({
  children,
  className = "",
  ...atributos
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...atributos}
    >
      {children}
    </div>
  );
}

/** Encabezado de página: título, descripción opcional y acciones a la derecha. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
        )}
      </div>
      {acciones && <div className="flex items-center gap-3">{acciones}</div>}
    </div>
  );
}

/** Una fila de barra proporcional para distribuciones simples (sin librería). */
export function BarraDistribucion({
  etiqueta,
  valor,
  total,
  sufijo,
}: {
  etiqueta: string;
  valor: number;
  total: number;
  sufijo?: string;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{etiqueta}</span>
        <span className="font-medium text-slate-800">
          {valor}
          {sufijo ? ` ${sufijo}` : ""}{" "}
          <span className="text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Tarjeta de estadística para el resumen (etiqueta + valor grande). */
export function TarjetaEstadistica({
  etiqueta,
  valor,
  detalle,
  icono,
}: {
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  icono?: ReactNode;
}) {
  return (
    <Tarjeta className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {valor}
          </p>
          {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
        </div>
        {icono && (
          <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
            {icono}
          </span>
        )}
      </div>
    </Tarjeta>
  );
}
