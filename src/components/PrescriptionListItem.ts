/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Card compacto de receta para listas.
 *
 * Reutilizable en: split view de recetas, detalle de paciente,
 * listado de recetas por veterinario, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import type { Prescription } from '../types/domain.js';
import { daysUntil, formatShortDate } from '../utils/formatters.js';
import { getStatusConfig } from '../utils/prescription-status.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface PrescriptionListItemProps {
  prescription: Prescription;
  selected?: boolean;
  onClick: () => void;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function PrescriptionListItem({
  prescription: rx,
  selected = false,
  onClick,
}: PrescriptionListItemProps) {
  const config = getStatusConfig(rx.status);
  const remaining = rx.status === 'active' ? daysUntil(rx.valid_until) : null;
  const expiresSoon = remaining !== null && remaining >= 0 && remaining <= 2;

  // Badge de estado
  const statusBadge = h(
    UI.Badge,
    {
      variant: 'outline',
      size: 'sm',
      icon: config.dotColor
        ? h('span', {
            style: {
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: config.dotColor,
            },
          })
        : undefined,
    },
    config.label
  );

  let expirationWarning: string | null = null;
  if (expiresSoon) {
    if (remaining === 0) {
      expirationWarning = '\u26a0 Vence hoy';
    } else if (remaining === 1) {
      expirationWarning = '\u26a0 Vence ma\u00f1ana';
    } else {
      expirationWarning = `\u26a0 Vence en ${remaining}d`;
    }
  }

  return h(
    'button',
    {
      type: 'button',
      onClick,
      className: UI.cn(
        'w-full text-left p-2.5 rounded-lg transition-colors duration-150',
        'flex flex-col gap-0.5',
        'cursor-pointer border',
        selected
          ? 'bg-cg-bg-active border-cg-border'
          : 'bg-cg-bg border-transparent hover:bg-cg-bg-hover'
      ),
    },

    // Fila 1: #number + badge estado + fecha
    h(
      'div',
      { className: 'flex items-center justify-between w-full gap-1' },
      h(
        'div',
        { className: 'flex items-center gap-1.5' },
        h('span', { className: 'text-sm font-semibold text-cg-text' }, `#${rx.number}`),
        statusBadge
      ),
      h('span', { className: 'text-xs text-cg-text-muted' }, formatShortDate(rx.issued_at))
    ),

    // Fila 2: mascota + dueño
    h(
      'div',
      { className: 'flex items-center gap-1 text-sm' },
      h('span', { className: 'font-medium text-cg-text truncate' }, rx.pet_name),
      h('span', { className: 'text-cg-text-muted' }, '\u00b7'),
      h('span', { className: 'text-cg-text-muted truncate' }, rx.owner_name)
    ),

    // Fila 3: veterinario
    h('span', { className: 'text-xs text-cg-text-muted truncate w-full' }, rx.vet_name),

    // Alerta de vencimiento
    expirationWarning
      ? h(UI.Badge, { variant: 'warning-soft', size: 'sm' }, expirationWarning)
      : null
  );
}
