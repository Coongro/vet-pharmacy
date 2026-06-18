/**
 * Utilidades de formateo reutilizables en todo el plugin.
 *
 * Centraliza date formatting y number formatting para evitar
 * duplicación entre componentes y vistas.
 */

const LOCALE = 'es-AR';

/** Fecha completa: "25/03/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso ?? '—';
  }
}

/** Fecha corta: "25/03" */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

/** Fecha corta con año corto: "25/03/26" */
export function formatCompactDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Días hasta una fecha. Negativo = ya pasó. null si no hay fecha. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/** Formatea cantidad numérica con locale: "1.234,5" */
export function formatQuantity(qty: string): string {
  const n = parseFloat(qty);
  return isNaN(n) ? qty : n.toLocaleString(LOCALE);
}
