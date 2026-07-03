/**
 * Gráfico de barras horizontales para comparar magnitudes (una sola serie).
 * Diseño consistente con el resto: un solo tono de marca, etiqueta de valor
 * directa, texto en tinta (no en color de serie) y ejes discretos. Sin leyenda
 * (una sola serie: el título la nombra).
 */

export interface DatoBarra {
  etiqueta: string;
  valor: number;
}

export function GraficoBarras({
  datos,
  formato,
  vacio = "Sin datos todavía.",
}: {
  datos: DatoBarra[];
  /** Cómo mostrar el valor (ej. formatear a pesos). Por defecto, el número. */
  formato?: (valor: number) => string;
  vacio?: string;
}) {
  if (datos.length === 0) {
    return <p className="text-sm text-slate-400">{vacio}</p>;
  }
  const max = Math.max(1, ...datos.map((d) => d.valor));

  return (
    <div className="space-y-3">
      {datos.map((d) => {
        const pct = Math.round((d.valor / max) * 100);
        return (
          <div key={d.etiqueta}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-600">{d.etiqueta}</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-800">
                {formato ? formato(d.valor) : d.valor}
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
      })}
    </div>
  );
}
