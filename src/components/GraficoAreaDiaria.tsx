"use client";

import { useRef, useState } from "react";
import { formatearPesos } from "@/lib/formato";

export interface PuntoDia {
  etiqueta: string; // ej. "2 jul"
  valor: number;
}

/**
 * Gráfico de área diario, estilo bursátil: línea de un solo tono de marca con
 * relleno degradado, cuadrícula discreta y tooltip al pasar el mouse. Una sola
 * serie (sin leyenda; el título la nombra). SVG puro, sin dependencias.
 */
export function GraficoAreaDiaria({ datos }: { datos: PuntoDia[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const n = datos.length;
  const W = 800;
  const H = 240;
  const padX = 6;
  const padTop = 16;
  const padBottom = 24;
  const max = Math.max(1, ...datos.map((d) => d.valor));

  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const y = (v: number) =>
    padTop + (1 - v / max) * (H - padTop - padBottom);
  const baseY = H - padBottom;

  const linea = datos
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`)
    .join(" ");
  const area = `${linea} L${x(n - 1).toFixed(1)},${baseY} L${x(0).toFixed(1)},${baseY} Z`;

  // Etiquetas del eje X: ~5 fechas repartidas.
  const pasos = Math.min(5, n);
  const ticks = Array.from({ length: pasos }, (_, k) =>
    Math.round((k / Math.max(1, pasos - 1)) * (n - 1)),
  );

  function alMover(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || n === 0) return;
    const rect = ref.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const i = Math.round(frac * (n - 1));
    setIdx(Math.min(n - 1, Math.max(0, i)));
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseMove={alMover}
      onMouseLeave={() => setIdx(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label="Ventas por día del último mes"
      >
        <defs>
          <linearGradient id="areaMarca" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8471f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#e8471f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Cuadrícula horizontal discreta */}
        {[0, 0.5, 1].map((f) => {
          const gy = padTop + f * (H - padTop - padBottom);
          return (
            <line
              key={f}
              x1={padX}
              y1={gy}
              x2={W - padX}
              y2={gy}
              stroke="#eef2f6"
              strokeWidth={1}
            />
          );
        })}

        {/* Área + línea */}
        <path d={area} fill="url(#areaMarca)" />
        <path d={linea} fill="none" stroke="#e8471f" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Crosshair + punto al pasar el mouse */}
        {idx !== null && (
          <g>
            <line x1={x(idx)} y1={padTop} x2={x(idx)} y2={baseY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(idx)} cy={y(datos[idx].valor)} r={4} fill="#e8471f" stroke="#ffffff" strokeWidth={2} />
          </g>
        )}

        {/* Etiquetas del eje X */}
        {ticks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontSize={12}
            fill="#94a3b8"
          >
            {datos[i]?.etiqueta}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {idx !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-xs text-white shadow-lg"
          style={{ left: `${(idx / Math.max(1, n - 1)) * 100}%` }}
        >
          <div className="font-semibold tabular-nums">{formatearPesos(datos[idx].valor)}</div>
          <div className="text-slate-300">{datos[idx].etiqueta}</div>
        </div>
      )}
    </div>
  );
}
