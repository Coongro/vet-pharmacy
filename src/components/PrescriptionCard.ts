/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Card compacto para columnas Kanban de recetas.
 * Borde izquierdo coloreado por estado, badge de vencimiento.
 */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import type { Prescription } from '../types/domain.js';
import { daysUntil, formatShortDate } from '../utils/formatters.js';
import { getStatusConfig } from '../utils/prescription-status.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

function getExpirationLabel(remaining: number): string {
  if (remaining === 0) return '\u26a0 Vence hoy';
  if (remaining === 1) return '\u26a0 Vence mañana';
  return `\u26a0 Vence en ${remaining}d`;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export interface PrescriptionCardProps {
  prescription: Prescription;
  onClick: () => void;
}

export function PrescriptionCard({ prescription: rx, onClick }: PrescriptionCardProps) {
  const borderColor = getStatusConfig(rx.status).color;
  const remaining = rx.status === 'active' ? daysUntil(rx.valid_until) : null;
  const expiresSoon = remaining !== null && remaining >= 0 && remaining <= 2;

  return h(
    'button',
    {
      type: 'button',
      onClick,
      className: 'w-full text-left p-0 bg-transparent border-none cursor-pointer',
    },
    h(
      UI.Card,
      {
        className:
          'flex flex-col gap-0.5 p-2.5 hover:bg-[var(--cg-bg-secondary)] transition-colors duration-100',
        style: { borderLeftWidth: '3px', borderLeftColor: borderColor } as React.CSSProperties,
      },
      // Fila 1: #number + fecha
      h(
        'div',
        { className: 'flex items-center justify-between w-full' },
        h(
          'span',
          { className: 'text-[13px] font-semibold text-[var(--cg-text)]' },
          `#${rx.number}`
        ),
        h(
          'span',
          { className: 'text-[11px] text-[var(--cg-text-muted)]' },
          formatShortDate(rx.issued_at)
        )
      ),
      // Fila 2: mascota
      h('span', { className: 'text-[13px] text-[var(--cg-text)] truncate w-full' }, rx.pet_name),
      // Fila 3: dueño
      rx.owner_name
        ? h(
            'span',
            { className: 'text-[11px] text-[var(--cg-text-muted)] truncate w-full' },
            rx.owner_name
          )
        : null,
      // Fila 4: veterinario
      h(
        'span',
        { className: 'text-[11px] text-[var(--cg-text-muted)] truncate w-full' },
        rx.vet_name
      ),
      // Badge de vencimiento
      expiresSoon
        ? h(
            UI.Badge,
            { variant: 'warning-soft', size: 'sm', className: 'mt-1 self-start' },
            getExpirationLabel(remaining)
          )
        : null
    )
  );
}
