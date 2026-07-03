import Link from "next/link";

/** Enlace a la vista imprimible (PDF) de una orden. Reutilizable en los paneles. */
export function EnlaceImprimir({ ordenId }: { ordenId: string }) {
  return (
    <Link
      href={`/imprimir/${ordenId}`}
      target="_blank"
      className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline"
    >
      PDF ↗
    </Link>
  );
}
