/**
 * Utilidades de texto para búsqueda.
 *
 * Módulo transversal y reutilizable: lo usan el repositorio (búsqueda de
 * productos) y los filtros de inventario, para que la coincidencia sea idéntica
 * en todos lados.
 */

/** Máximo de productos que muestra el buscador en vivo del cotizador. */
export const LIMITE_BUSQUEDA_PRODUCTOS = 10;

/** Normaliza texto para comparar: sin acentos, en minúscula y sin espacios extra. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Coincidencia "inteligente" por palabras: divide el término en tokens y exige
 * que TODOS aparezcan en alguno de los campos (en cualquier orden). Así "ssd
 * 256" encuentra "SSD Patriot 256". Un término vacío coincide con todo.
 */
export function coincideTokens(campos: string[], termino: string): boolean {
  const tokens = normalizar(termino).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const texto = campos.map(normalizar).join(" ");
  return tokens.every((token) => texto.includes(token));
}
