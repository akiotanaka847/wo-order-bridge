"use client";

/** Botones de acción de la vista imprimible; se ocultan al imprimir. */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
