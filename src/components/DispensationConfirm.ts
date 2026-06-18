/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Componente reutilizable de confirmación de dispensación.
 *
 * Muestra el preview FIFO de lotes que serán consumidos y permite
 * confirmar o cancelar. Reutilizable en cualquier contexto donde
 * se necesite dispensar una receta (split view, modal, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { useDispensationPreview } from '../hooks/useDispensationPreview.js';
import type { ItemPreview } from '../types/domain.js';
import { formatCompactDate } from '../utils/formatters.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useCallback } = React;
const h = React.createElement;

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function ItemRow({ item }: { item: ItemPreview }) {
  if (item.batches.length === 0) {
    return h(
      'div',
      { className: 'flex items-center justify-between py-2 px-3 rounded-lg bg-cg-bg-secondary' },
      h('span', { className: 'text-sm text-cg-text' }, item.medicationName),
      h('span', { className: 'text-xs text-cg-text-muted' }, 'Sin stock vinculado')
    );
  }

  const stockColor = item.hasStock ? '#3D9A5C' : '#F5A800';
  const stockLabel = item.hasStock ? 'Stock OK' : 'Stock insuficiente';

  const stockBadge = h(
    UI.Badge,
    {
      variant: 'outline',
      size: 'sm',
      icon: h('span', {
        style: {
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: stockColor,
        },
      }),
    },
    stockLabel
  );

  return h(
    'div',
    { className: 'flex flex-col gap-1.5 py-2 px-3 rounded-lg border border-cg-border bg-cg-bg' },
    // Nombre del medicamento + estado
    h(
      'div',
      { className: 'flex items-center justify-between' },
      h('span', { className: 'text-sm font-medium text-cg-text' }, item.medicationName),
      stockBadge
    ),
    // Lotes FIFO
    ...item.batches.map((batch) =>
      h(
        'div',
        {
          key: batch.batchId,
          className: 'flex items-center gap-3 pl-3 text-xs text-cg-text-muted',
        },
        h('span', { className: 'font-medium' }, batch.batchNumber),
        h('span', null, `vence ${formatCompactDate(batch.expirationDate)}`),
        h('span', null, `${batch.available} disp.`),
        h(
          'span',
          { className: 'text-xs font-medium text-cg-text' },
          `\u2192 ${batch.toConsume} a descontar`
        )
      )
    )
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface DispensationConfirmProps {
  prescriptionId: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

// ─── Componente principal ───────────────────────────────────────────────────

export function DispensationConfirm({
  prescriptionId,
  onConfirm,
  onCancel,
  confirming = false,
}: DispensationConfirmProps) {
  const { preview, loading, error } = useDispensationPreview(prescriptionId);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  // Loading
  if (loading) {
    return h(
      'div',
      { className: 'p-4' },
      h(UI.LoadingOverlay, { variant: 'dots', inline: true, label: 'Calculando stock...' })
    );
  }

  // Error
  if (error) {
    return h(UI.ErrorDisplay, {
      title: 'Error',
      message: error,
    });
  }

  // Sin preview
  if (!preview) return null;

  const hasAnyStock = preview.items.some((i) => i.batches.length > 0);
  const allHaveStock = preview.items.every((i) => !i.productId || i.hasStock);

  return h(
    'div',
    { className: 'flex flex-col gap-3 p-4 rounded-lg border border-cg-border bg-cg-bg' },

    // Título
    h(
      'div',
      { className: 'flex items-center gap-2' },
      h(UI.DynamicIcon, { icon: 'PackageCheck', size: 16 }),
      h('span', { className: 'text-sm font-semibold text-cg-text' }, 'Confirmar dispensación')
    ),

    // Warning si stock insuficiente
    !allHaveStock
      ? h(
          'div',
          {
            className:
              'flex items-center gap-2 px-3 py-2 rounded-lg bg-cg-warning-bg text-cg-warning-text text-xs',
          },
          h(UI.DynamicIcon, { icon: 'AlertTriangle', size: 14 }),
          'Algunos medicamentos no tienen stock suficiente. Se dispensará lo disponible.'
        )
      : null,

    // Lista de items con lotes
    ...preview.items.map((item) => h(ItemRow, { key: item.itemId, item })),

    // Acciones
    h(
      'div',
      { className: 'flex gap-2 pt-2 border-t border-cg-border' },
      h(
        UI.Button,
        {
          onClick: handleConfirm,
          disabled: confirming || !hasAnyStock,
          size: 'sm',
        },
        confirming ? 'Dispensando...' : 'Confirmar dispensación'
      ),
      h(
        UI.Button,
        {
          variant: 'outline',
          onClick: onCancel,
          disabled: confirming,
          size: 'sm',
        },
        'Cancelar'
      )
    )
  );
}
