/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Panel de detalle de receta.
 * Muestra info completa, tabla de items, alerta de vencimiento, y acciones (dispensar/cancelar/imprimir).
 */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { usePrescription } from '../hooks/usePrescription.js';
import type { usePrescriptionMutations } from '../hooks/usePrescriptionMutations.js';
import type { PrescriptionWithItems } from '../types/domain.js';
import { daysUntil, formatDate } from '../utils/formatters.js';
import { getStatusConfig } from '../utils/prescription-status.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useCallback } = React;
const h = React.createElement;

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: import('../types/domain.js').PrescriptionStatus }) {
  const config = getStatusConfig(status);
  return h(
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
}

// Skeleton importado del componente reutilizable
import { PrescriptionDetailSkeleton } from './skeletons/PrescriptionDetailSkeleton.js';

// ─── Alerta de vencimiento ──────────────────────────────────────────────────

function ExpirationBanner({ validUntil }: { validUntil: string | null | undefined }) {
  const remaining = daysUntil(validUntil);
  if (remaining === null || remaining > 2 || remaining < 0) return null;

  let msg: string;
  if (remaining === 0) {
    msg = '\u26a0 Esta receta vence hoy';
  } else if (remaining === 1) {
    msg = '\u26a0 Esta receta vence ma\u00f1ana';
  } else {
    msg = `\u26a0 Esta receta vence en ${remaining} d\u00edas`;
  }

  return h(
    'div',
    {
      className:
        'flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium mb-5 bg-cg-warning-bg text-cg-warning-text',
    },
    h('span', null, msg),
    h('span', { className: 'text-xs opacity-80' }, `\u2014 ${formatDate(validUntil)}`)
  );
}

// ─── Imprimir ───────────────────────────────────────────────────────────────

export function printPrescription(rx: PrescriptionWithItems) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const itemsHtml = (rx.items ?? [])
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${it.medication_name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${it.dosage_amount ?? ''}${it.dosage_unit ? ' ' + it.dosage_unit : ''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${it.duration_amount ? it.duration_amount + ' ' + (it.duration_unit ?? 'días') : '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${it.quantity}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Receta #${rx.number}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 24px; }
  .grid-item label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 1px; }
  .grid-item span { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; background: #f8f8f8; border-bottom: 2px solid #e5e7eb; }
  .notes { font-style: italic; color: #555; margin-bottom: 40px; }
  .signature { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-line { width: 200px; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 11px; color: #666; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<h1>Receta N.° ${rx.number}</h1>
<div class="subtitle">Emitida: ${formatDate(rx.issued_at)} · Válida hasta: ${formatDate(rx.valid_until)}</div>
<div class="grid">
  <div class="grid-item"><label>Mascota</label><span>${rx.pet_name}</span></div>
  <div class="grid-item"><label>Dueño</label><span>${rx.owner_name}</span></div>
  <div class="grid-item"><label>Veterinario</label><span>${rx.vet_name}</span></div>
  <div class="grid-item"><label>Matrícula</label><span>${rx.vet_license ?? '—'}</span></div>
  <div class="grid-item" style="grid-column:1/-1"><label>Diagnóstico</label><span>${rx.diagnosis ?? '—'}</span></div>
</div>
<table>
  <thead><tr>
    <th>Medicamento</th><th>Dosis</th><th>Duración</th><th>Cantidad</th>
  </tr></thead>
  <tbody>${itemsHtml || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#888">Sin medicamentos</td></tr>'}</tbody>
</table>
${rx.notes ? `<div class="notes"><strong>Notas:</strong> ${rx.notes}</div>` : ''}
<div class="signature">
  <div class="signature-line">Firma del veterinario</div>
  <div class="signature-line">Sello</div>
</div>
</body></html>`;

  doc.open();
  doc.write(html);
  doc.close();

  // Esperar a que cargue y luego imprimir
  iframe.onload = () => {
    try {
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }
  };
  // Trigger load si ya cargó
  if (iframe.contentDocument?.readyState === 'complete') {
    try {
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }
  }
}

// ─── Section icons (Lucide via DynamicIcon) ─────────────────────────────────

const SECTION_ICONS: Record<string, string> = {
  Paciente: 'PawPrint',
  Propietario: 'User',
  Veterinario: 'Stethoscope',
  Diagnóstico: 'ClipboardList',
  'Medicamentos recetados': 'Pill',
  Notas: 'MessageSquareText',
};

// ─── Section label helper ────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const iconName = SECTION_ICONS[label];
  return h(
    'div',
    { className: 'flex items-center gap-1.5 mb-1' },
    iconName ? h(UI.DynamicIcon, { icon: iconName, size: 13, color: '#9B9893' }) : null,
    h(
      UI.Label,
      {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
          color: '#9B9893',
        },
      },
      label
    )
  );
}

// ─── Info item helper ───────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return h(
    'div',
    { className: 'flex flex-col gap-0.5' },
    h(SectionLabel, { label }),
    h('span', { className: 'text-sm text-cg-text' }, value)
  );
}

// ─── Componente ─────────────────────────────────────────────────────────────

export interface PrescriptionDetailPanelProps {
  selectedId: string;
  mutations: ReturnType<typeof usePrescriptionMutations>;
  onStatusChanged?: () => void;
  /** Callback para iniciar flujo de dispensación externo (ej: B4 split view) */
  onDispenseClick?: () => void;
  /** Ocultar acciones por defecto (cuando el flujo de dispensación está activo externamente) */
  hideDefaultActions?: boolean;
}

export function PrescriptionDetailPanel({
  selectedId,
  mutations,
  onStatusChanged,
  onDispenseClick,
  hideDefaultActions = false,
}: PrescriptionDetailPanelProps) {
  const { prescription, loading, refetch } = usePrescription(selectedId);

  const handleDispense = useCallback(async () => {
    const ok = await mutations.dispense(selectedId);
    if (ok) {
      void refetch();
      if (onStatusChanged) onStatusChanged();
    }
  }, [selectedId, mutations, refetch, onStatusChanged]);

  const handleCancel = useCallback(async () => {
    const ok = await mutations.cancel(selectedId, 'Cancelada desde detalle');
    if (ok) {
      void refetch();
      if (onStatusChanged) onStatusChanged();
    }
  }, [selectedId, mutations, refetch, onStatusChanged]);

  const handlePrint = useCallback(() => {
    if (prescription) printPrescription(prescription);
  }, [prescription]);

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return h(
      React.Fragment,
      null,
      h(
        'div',
        {
          className:
            'flex items-center justify-between px-6 py-4 border-b border-cg-border bg-cg-bg',
        },
        h('h2', { className: 'text-base font-semibold text-cg-text' }, 'Cargando...')
      ),
      h(
        'div',
        { className: 'flex-1 overflow-y-auto overflow-x-hidden p-6 min-w-0' },
        h(PrescriptionDetailSkeleton, null)
      )
    );
  }

  // ─── No encontrada ──────────────────────────────────────────────────────

  if (!prescription) {
    return h(
      React.Fragment,
      null,
      h(
        'div',
        {
          className:
            'flex items-center justify-between px-6 py-4 border-b border-cg-border bg-cg-bg',
        },
        h('h2', { className: 'text-base font-semibold text-cg-text' }, 'Receta')
      ),
      h(
        'div',
        { className: 'flex-1 overflow-y-auto overflow-x-hidden p-6 min-w-0' },
        h('p', { className: 'text-sm text-cg-text-muted' }, 'Receta no encontrada')
      )
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return h(
    React.Fragment,
    null,
    // Header
    h(
      'div',
      {
        className:
          'flex items-center justify-between px-6 py-4 border-b border-cg-border bg-cg-bg shrink-0',
      },
      h(
        'h2',
        {
          className: 'text-cg-text m-0 flex items-center gap-2.5',
          style: { fontFamily: "'Noto Serif JP', serif", fontWeight: 700, fontSize: '17px' },
        },
        `Receta #${prescription.number}`,
        h(StatusBadge, { status: prescription.status })
      )
    ),
    // Body
    h(
      'div',
      { className: 'flex-1 overflow-y-auto overflow-x-hidden p-6 min-w-0' },
      // Alerta de vencimiento
      prescription.status === 'active'
        ? h(ExpirationBanner, { validUntil: prescription.valid_until })
        : null,
      // Info bento: Paciente | Propietario | Veterinario
      h(
        'div',
        {
          className:
            'flex flex-col sm:flex-row mb-5 rounded-lg border border-cg-border overflow-hidden',
          style: { borderRadius: 18 },
        },
        h(
          'div',
          { className: 'flex-1 p-3' },
          h(InfoItem, { label: 'Paciente', value: prescription.pet_name || '\u2014' })
        ),
        h('div', { className: 'border-b sm:border-b-0 sm:border-r border-cg-border' }),
        h(
          'div',
          { className: 'flex-1 p-3' },
          h(InfoItem, { label: 'Propietario', value: prescription.owner_name || '\u2014' })
        ),
        h('div', { className: 'border-b sm:border-b-0 sm:border-r border-cg-border' }),
        h(
          'div',
          { className: 'flex-1 p-3' },
          h(InfoItem, { label: 'Veterinario', value: prescription.vet_name || '\u2014' })
        )
      ),
      // Diagnóstico (divisor + bento)
      h(
        'div',
        {
          className:
            'flex flex-col sm:flex-row mb-5 rounded-lg border border-cg-border overflow-hidden',
          style: { borderRadius: 18 },
        },
        h(
          'div',
          { className: 'flex-1 p-3' },
          h(InfoItem, { label: 'Diagnóstico', value: prescription.diagnosis || '\u2014' })
        ),
        h('div', { className: 'border-b sm:border-b-0 sm:border-r border-cg-border' }),
        h(
          'div',
          { className: 'p-3', style: { minWidth: '140px' } },
          h(InfoItem, { label: 'Emitida', value: formatDate(prescription.issued_at) })
        ),
        h('div', { className: 'border-b sm:border-b-0 sm:border-r border-cg-border' }),
        h(
          'div',
          { className: 'p-3', style: { minWidth: '140px' } },
          h(InfoItem, { label: 'Válida hasta', value: formatDate(prescription.valid_until) })
        )
      ),
      // Items table
      h(
        'div',
        { className: 'mb-2.5 pb-1.5 border-b border-cg-border' },
        h(SectionLabel, { label: 'Medicamentos recetados' })
      ),
      h(
        'div',
        { className: 'mb-5 rounded-lg border border-cg-border overflow-x-auto' },
        h(
          UI.Table,
          null,
          h(
            UI.TableHeader,
            { style: { background: 'transparent' } },
            h(
              UI.TableRow,
              null,
              ...[
                'Medicamento',
                'Dosis',
                'Vía',
                'Frecuencia',
                'Duración',
                'Cantidad',
                'Dispensado',
              ].map((col) =>
                h(
                  UI.TableHead,
                  {
                    key: col,
                    style: {
                      background: 'transparent',
                      color: '#9B9893',
                      fontSize: '11px',
                      fontWeight: 500,
                    },
                  },
                  col
                )
              )
            )
          ),
          h(
            UI.TableBody,
            null,
            !prescription.items || prescription.items.length === 0
              ? h(
                  UI.TableRow,
                  null,
                  h(
                    UI.TableCell,
                    { colSpan: 7, className: 'text-center text-cg-text-muted' },
                    'Sin medicamentos'
                  )
                )
              : prescription.items.map((item) =>
                  h(
                    UI.TableRow,
                    { key: item.id },
                    h(UI.TableCell, null, item.medication_name),
                    h(
                      UI.TableCell,
                      null,
                      item.dosage_amount ? `${item.dosage_amount} ${item.dosage_unit ?? ''}` : '—'
                    ),
                    h(UI.TableCell, null, item.route ?? '—'),
                    h(
                      UI.TableCell,
                      null,
                      item.frequency_hours ? `c/${item.frequency_hours}h` : '—'
                    ),
                    h(
                      UI.TableCell,
                      null,
                      item.duration_amount
                        ? `${item.duration_amount} ${item.duration_unit ?? 'días'}`
                        : '—'
                    ),
                    h(UI.TableCell, null, item.quantity),
                    h(UI.TableCell, null, item.dispensed_quantity)
                  )
                )
          )
        )
      ),
      // Notas
      prescription.notes
        ? h(
            'div',
            null,
            h(
              'div',
              { className: 'mb-2.5 pb-1.5 border-b border-cg-border' },
              h(SectionLabel, { label: 'Notas' })
            ),
            h('p', { className: 'text-sm text-cg-text m-0 leading-relaxed' }, prescription.notes)
          )
        : null,
      // Acciones
      !hideDefaultActions
        ? h(
            'div',
            {
              className: 'flex gap-2.5 p-5 border-t border-cg-border mt-5 bg-cg-bg',
            },
            prescription.status === 'active'
              ? h(
                  React.Fragment,
                  null,
                  h(
                    UI.Button,
                    {
                      disabled: mutations.dispensing,
                      onClick: onDispenseClick ?? handleDispense,
                    },
                    'Dispensar'
                  ),
                  h(
                    UI.Button,
                    {
                      variant: 'ghost',
                      disabled: mutations.transitioning,
                      onClick: handleCancel,
                      className: 'text-cg-danger',
                    },
                    mutations.transitioning ? 'Cancelando...' : 'Cancelar receta'
                  )
                )
              : null,
            h(
              UI.Button,
              {
                variant: 'outline',
                onClick: handlePrint,
              },
              h(UI.DynamicIcon, { icon: 'Printer', size: 14 }),
              'Imprimir'
            )
          )
        : null
    )
  );
}
