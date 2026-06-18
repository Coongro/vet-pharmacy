/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Skeleton de carga para el detalle de receta (panel derecho del split view).
 *
 * Replica la estructura visual de: header + info grid + tabla de medicamentos + acciones.
 * Reutilizable en cualquier detalle de receta (split view, modal, standalone).
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

const ITEM_ROWS = 3;
const INFO_FIELDS = 6;

export function PrescriptionDetailSkeleton() {
  return h(
    React.Fragment,
    null,

    // Header: título + badge
    h(
      'div',
      {
        className: 'flex items-center justify-between px-6 py-4 border-b border-cg-border',
      },
      h(
        'div',
        { className: 'flex items-center gap-3' },
        h(UI.Skeleton, { className: 'h-6 w-32' }),
        h(UI.Skeleton, { className: 'h-5 w-16 rounded-full' })
      )
    ),

    // Body
    h(
      'div',
      { className: 'flex-1 overflow-y-auto p-6 flex flex-col gap-6' },

      // Info grid 2×3
      h(
        'div',
        { className: 'grid grid-cols-2 gap-x-6 gap-y-4' },
        ...Array.from({ length: INFO_FIELDS }, (_, i) =>
          h(
            'div',
            { key: i, className: 'flex flex-col gap-1.5' },
            h(UI.Skeleton, { className: 'h-3 w-16' }),
            h(UI.Skeleton, { className: 'h-4 w-3/4' })
          )
        )
      ),

      // Diagnóstico (full width)
      h(
        'div',
        { className: 'flex flex-col gap-1.5' },
        h(UI.Skeleton, { className: 'h-3 w-20' }),
        h(UI.Skeleton, { className: 'h-4 w-full' })
      ),

      // Sección: Medicamentos (uppercase tracking label)
      h(UI.Skeleton, { className: 'h-3 w-40 mt-2' }),

      // Tabla skeleton
      h(
        'div',
        { className: 'rounded-lg border border-cg-border overflow-hidden shadow-sm' },
        // Header de tabla
        h(
          'div',
          { className: 'flex gap-4 px-3 py-2.5 bg-cg-bg-secondary' },
          h(UI.Skeleton, { className: 'h-3 w-24' }),
          h(UI.Skeleton, { className: 'h-3 w-16' }),
          h(UI.Skeleton, { className: 'h-3 w-16' }),
          h(UI.Skeleton, { className: 'h-3 w-12' }),
          h(UI.Skeleton, { className: 'h-3 w-16' })
        ),
        // Filas
        ...Array.from({ length: ITEM_ROWS }, (_, i) =>
          h(
            'div',
            {
              key: i,
              className: 'flex gap-4 px-3 py-2.5 border-t border-cg-border',
            },
            h(UI.Skeleton, { className: 'h-4 w-28' }),
            h(UI.Skeleton, { className: 'h-4 w-14' }),
            h(UI.Skeleton, { className: 'h-4 w-14' }),
            h(UI.Skeleton, { className: 'h-4 w-10' }),
            h(UI.Skeleton, { className: 'h-4 w-12' })
          )
        )
      ),

      // Acciones
      h(
        'div',
        { className: 'flex gap-2.5 pt-5 border-t border-cg-border' },
        h(UI.Skeleton, { className: 'h-9 w-24 rounded-lg' }),
        h(UI.Skeleton, { className: 'h-9 w-20 rounded-lg' }),
        h(UI.Skeleton, { className: 'h-9 w-20 rounded-lg' })
      )
    )
  );
}
