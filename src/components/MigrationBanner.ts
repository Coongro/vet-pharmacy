/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, usePlugin } from '@coongro/plugin-sdk';

import type { DetectedMedication } from '../hooks/useDetectTextMedications.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useCallback } = React;
const h = React.createElement;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MigrationBannerProps {
  detected: DetectedMedication[];
  creating: boolean;
  onCreateAll: (names: string[]) => Promise<number>;
  onDismiss: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MigrationBanner({
  detected,
  creating,
  onCreateAll,
  onDismiss,
}: MigrationBannerProps) {
  const { toast } = usePlugin();
  const [expanded, setExpanded] = useState(false);

  const totalCount = detected.reduce((sum, d) => sum + d.count, 0);

  const handleCreate = useCallback(async () => {
    try {
      const names = detected.map((d) => d.name);
      const created = await onCreateAll(names);
      toast.success(
        'Medicamentos creados',
        `Se crearon ${created} medicamentos. Editá cada uno para completar la información.`
      );
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudieron crear');
    }
  }, [detected, onCreateAll, toast]);

  if (detected.length === 0) return null;

  return h(
    UI.Card,
    {
      className:
        'mb-4 border-[var(--cg-warning)] bg-[color-mix(in_srgb,var(--cg-warning)_8%,var(--cg-bg))]',
    },
    h(
      UI.CardBody,
      { className: 'flex flex-col gap-3 p-4' },

      // Header
      h(
        'div',
        { className: 'flex items-center justify-between gap-3' },
        h(
          'div',
          null,
          h(
            'p',
            {
              className: 'text-sm font-semibold text-[var(--cg-text)] m-0 flex items-center gap-2',
            },
            h(UI.DynamicIcon, { icon: 'triangle-alert', size: 16 }),
            'Medicamentos detectados en consultas previas',
            h(UI.Badge, { variant: 'warning' }, String(detected.length))
          ),
          h(
            'p',
            { className: 'text-[13px] text-[var(--cg-text-muted)] mt-1 leading-snug' },
            `Se encontraron ${detected.length} medicamentos escritos como texto libre ` +
              `en ${totalCount} registros de consultas. ` +
              'Podés crearlos automáticamente como productos farmacéuticos para gestionarlos mejor.'
          )
        )
      ),

      // Toggle para ver la lista
      h(
        UI.Button,
        {
          variant: 'link',
          size: 'sm',
          className: 'self-start p-0 h-auto',
          onClick: () => setExpanded((prev: boolean) => !prev),
        },
        expanded ? 'Ocultar lista' : 'Ver lista de medicamentos'
      ),

      // Lista expandible
      expanded
        ? h(
            UI.ScrollArea,
            {
              className:
                'max-h-[200px] border border-[var(--cg-border)] rounded-md bg-[var(--cg-bg)]',
            },
            ...detected.map((d, i) =>
              h(
                'div',
                {
                  key: d.name,
                  className: UI.cn(
                    'flex items-center justify-between px-3 py-2 text-[13px] text-[var(--cg-text)]',
                    i < detected.length - 1 && 'border-b border-[var(--cg-border)]'
                  ),
                },
                h('span', null, d.name),
                h(
                  'span',
                  { className: 'text-xs text-[var(--cg-text-muted)] whitespace-nowrap' },
                  d.count === 1 ? '1 registro' : `${d.count} registros`
                )
              )
            )
          )
        : null,

      // Botones de acción
      h(
        'div',
        { className: 'flex gap-2 justify-end' },
        h(
          UI.Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: onDismiss,
            disabled: creating,
          },
          'Descartar'
        ),
        h(
          UI.Button,
          {
            variant: 'brand',
            size: 'sm',
            onClick: () => void handleCreate(),
            disabled: creating,
          },
          creating ? 'Creando...' : `Crear ${detected.length} medicamentos`
        )
      )
    )
  );
}
