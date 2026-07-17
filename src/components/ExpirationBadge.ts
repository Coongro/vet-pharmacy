/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, settings } from '@coongro/plugin-sdk';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useEffect } = React;
const h = React.createElement;

interface ExpirationBadgeProps {
  expirationDate: string;
}

/**
 * Calcula los días restantes hasta la fecha de vencimiento.
 * Retorna un número negativo o cero si ya venció.
 */
function getDaysUntilExpiry(expirationDate: string): number {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// `alertDays` = umbral configurable (setting genérica de stock `products.stock.alertDays`)
// para el aviso "por vencer". Menos de 7 días siempre es urgente (danger); entre 7 y
// alertDays, aviso.
function getBadgeVariant(days: number, alertDays: number): string {
  if (days <= 0) return 'destructive';
  if (days < 7) return 'danger-soft';
  if (days < alertDays) return 'warning-soft';
  return 'success-soft';
}

function getBadgeLabel(days: number): string {
  if (days <= 0) return 'Vencido';
  return `${days} días`;
}

export function ExpirationBadge({ expirationDate }: ExpirationBadgeProps) {
  // Umbral de aviso configurable por tenant (default 30 días). Antes estaba hardcodeado en 30
  // y la setting quedaba sin consumir (fantasma); ahora la lee.
  const [alertDays, setAlertDays] = useState(30);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const v = await settings.get<number>('products.stock.alertDays');
        if (active && v !== null && v !== undefined) setAlertDays(v);
      } catch {
        /* setting no disponible: queda el default de 30 */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Estado de carga: renderizar skeleton si no hay fecha
  if (!expirationDate) {
    return h(UI.Skeleton, { className: 'w-16 h-5 rounded-full' });
  }

  const days = getDaysUntilExpiry(expirationDate);
  const variant = getBadgeVariant(days, alertDays);
  const label = getBadgeLabel(days);

  return h(UI.Badge, { variant, size: 'sm' }, label);
}
