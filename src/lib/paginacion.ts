/**
 * Paginación de listas para las tablas de los paneles.
 *
 * Módulo puro y reutilizable. Las páginas cargan la lista completa (para que los
 * resúmenes/contadores muestren el total real) y solo muestran en tabla la
 * porción de la página actual.
 */

/** Cantidad de filas por página en todas las tablas. */
export const TAMANO_PAGINA = 20;

export interface Pagina<T> {
  /** Filas de la página actual. */
  items: T[];
  /** Número de página (1-based, ya saneado dentro de rango). */
  pagina: number;
  /** Total de páginas disponibles (mínimo 1). */
  totalPaginas: number;
  /** Total de elementos en la lista completa. */
  total: number;
}

/** Convierte el query param `page` (string | undefined) en un número >= 1. */
export function leerPagina(page: string | undefined): number {
  const n = Number(page);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
}

/** Corta la lista a la página pedida, saneando el número dentro de rango. */
export function paginar<T>(
  lista: T[],
  pagina: number,
  tamano: number = TAMANO_PAGINA,
): Pagina<T> {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * tamano;
  return {
    items: lista.slice(inicio, inicio + tamano),
    pagina: actual,
    totalPaginas,
    total,
  };
}
