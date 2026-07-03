/**
 * Esqueleto de carga de una vista de panel (título + tarjetas + tabla).
 * Lo usan los `loading.tsx` de los paneles para que el cambio de vista sea
 * instantáneo: la estructura aparece al primer clic mientras el servidor
 * prepara los datos.
 */

function Bloque({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function EsqueletoPanel() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando…">
      {/* Título y descripción */}
      <div className="space-y-2">
        <Bloque className="h-7 w-48" />
        <Bloque className="h-4 w-72" />
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Bloque className="h-4 w-24" />
            <Bloque className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <Bloque className="h-4 w-full max-w-md" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Bloque key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
