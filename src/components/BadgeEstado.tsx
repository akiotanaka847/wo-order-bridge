import type { EstadoOrden } from "@/domain/tipos";

const ESTILOS: Record<EstadoOrden, { texto: string; clase: string }> = {
  cotizacion: { texto: "Cotización", clase: "bg-amber-100 text-amber-800" },
  pedido: { texto: "Pedido", clase: "bg-blue-100 text-blue-800" },
  facturado: { texto: "Facturado", clase: "bg-emerald-100 text-emerald-800" },
};

/** Etiqueta de color según el estado de la orden. Reutilizable en los 3 paneles. */
export function BadgeEstado({ estado }: { estado: EstadoOrden }) {
  const { texto, clase } = ESTILOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${clase}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
      {texto}
    </span>
  );
}
