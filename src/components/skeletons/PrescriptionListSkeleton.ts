/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Skeleton de carga para la lista de recetas (panel izquierdo del split view).
 *
 * Replica la estructura visual de: header + search + tabs + list items.
 * Reutilizable en cualquier lista de recetas (split view, modal, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

const ITEM_COUNT = 5;
const TAB_COUNT = 4;

export function PrescriptionListSkeleton() {
  return h(
    'div',
    { className: 'flex flex-col gap-2 p-3' },

    // Search input
    h(UI.Skeleton, { className: 'h-9 w-full rounded-lg' }),

    // Tabs
    h(
      'div',
      { className: 'flex gap-1.5 py-1' },
      ...Array.from({ length: TAB_COUNT }, (_, i) =>
        h(UI.Skeleton, { key: i, className: 'h-7 w-16 rounded-lg' })
      )
    ),

    // List items
    ...Array.from({ length: ITEM_COUNT }, (_, i) =>
      h(
        'div',
        {
          key: i,
          className:
            'flex flex-col gap-1.5 p-2.5 rounded-lg border border-cg-border border-l-[3px] border-l-cg-skeleton',
        },
        // Fila 1: #number + badge + fecha
        h(
          'div',
          { className: 'flex items-center justify-between' },
          h(
            'div',
            { className: 'flex items-center gap-1.5' },
            h(UI.Skeleton, { className: 'h-4 w-8' }),
            h(UI.Skeleton, { className: 'h-5 w-14 rounded-full' })
          ),
          h(UI.Skeleton, { className: 'h-3 w-10' })
        ),
        // Fila 2: mascota + dueño
        h(UI.Skeleton, { className: 'h-4 w-3/4' }),
        // Fila 3: veterinario
        h(UI.Skeleton, { className: 'h-3 w-1/2' })
      )
    )
  );
}
