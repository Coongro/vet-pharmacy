/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
/**
 * Card de un ítem de medicamento con campos estructurados.
 */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { DOSAGE_UNITS, ROUTES, DURATION_UNITS } from '../../constants/medication.js';
import type { Medication } from '../../types/domain.js';
import { AutocompleteInput } from '../AutocompleteInput.js';

import { calcDispensQuantity } from './helpers.js';
import { FrequencyChips, DurationChips } from './PresetChips.js';
import { searchMedications } from './search.js';
import type { ItemDraft } from './types.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

function renderMedicationOption(med: Medication) {
  return h(
    React.Fragment,
    null,
    h('div', { style: { fontWeight: '500', fontSize: '13px' } }, med.active_ingredient),
    h(
      'div',
      { style: { fontSize: '11px', color: 'var(--cg-text-muted)' } },
      [med.concentration, med.laboratory, med.administration_route].filter(Boolean).join(' — ')
    )
  );
}

export interface MedicationItemCardProps {
  item: ItemDraft;
  index: number;
  onUpdate: (
    key: string,
    field: keyof Omit<ItemDraft, 'key'>,
    value: string | number | null
  ) => void;
  onMedicationSelect: (key: string, med: Medication) => void;
  onRemove: (key: string) => void;
}

export function MedicationItemCard({
  item,
  index,
  onUpdate,
  onMedicationSelect,
  onRemove,
}: MedicationItemCardProps) {
  const calculated = calcDispensQuantity(item);

  return h(
    UI.Card,
    { className: 'flex flex-col gap-3 p-3' },

    // Fila 1: Medicamento + eliminar
    h(
      'div',
      { className: 'flex items-end gap-2' },
      h(
        'div',
        { className: 'flex-1' },
        h(AutocompleteInput, {
          label: `Medicamento ${index + 1}`,
          value: item.medication_name,
          onChange: (val: string) => onUpdate(item.key, 'medication_name', val),
          onSearch: searchMedications,
          onSelect: (med: Medication) => onMedicationSelect(item.key, med),
          renderOption: renderMedicationOption,
          placeholder: 'Buscar principio activo o producto...',
          showToggle: true,
          minChars: 0,
        } as any)
      ),
      h(
        UI.IconButton,
        {
          variant: 'danger',
          size: 'sm',
          shape: 'square',
          onClick: () => onRemove(item.key),
          title: 'Eliminar',
        },
        h(UI.DynamicIcon, { icon: 'X', size: 14 })
      )
    ),

    // Fila 2: Dosis (amount + unit) | Vía | Indicaciones
    h(
      'div',
      { className: 'grid grid-cols-[1fr_1fr_1fr] gap-2' },
      h(
        'div',
        { className: 'flex flex-col gap-1' },
        h(UI.Label, { className: 'text-[11px]' }, 'Dosis'),
        h(
          'div',
          { className: 'flex gap-1' },
          h(UI.Input, {
            size: 'sm',
            type: 'number',
            step: 'any',
            value: item.dosage_amount,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdate(item.key, 'dosage_amount', e.target.value),
            placeholder: '15',
            className: 'flex-1',
          }),
          h(
            UI.Select,
            {
              value: item.dosage_unit,
              onValueChange: (v: string) => onUpdate(item.key, 'dosage_unit', v),
            },
            ...DOSAGE_UNITS.map((u) => h(UI.SelectItem, { key: u, value: u }, u))
          )
        )
      ),
      h(
        'div',
        { className: 'flex flex-col gap-1' },
        h(UI.Label, { className: 'text-[11px]' }, 'Vía'),
        h(
          UI.Select,
          {
            value: item.route,
            onValueChange: (v: string) => onUpdate(item.key, 'route', v),
            placeholder: 'Seleccionar...',
          },
          ...ROUTES.map((r) => h(UI.SelectItem, { key: r, value: r }, r))
        )
      ),
      h(
        'div',
        { className: 'flex flex-col gap-1' },
        h(UI.Label, { className: 'text-[11px]' }, 'Indicaciones'),
        h(UI.Input, {
          size: 'sm',
          value: '',
          onChange: () => {},
          placeholder: 'Con comida...',
        })
      )
    ),

    // Fila 3: Frecuencia | Duración | Cantidad
    h(
      'div',
      { className: 'grid grid-cols-[1fr_1fr_1fr] gap-2' },
      // Frecuencia
      h(
        'div',
        { className: 'flex flex-col gap-1' },
        h(UI.Label, { className: 'text-[11px]' }, 'Frecuencia'),
        h(
          'div',
          { className: 'flex items-center gap-1.5' },
          h('span', { className: 'text-[12px] text-[var(--cg-text-muted)]' }, 'Cada'),
          h(UI.Input, {
            size: 'sm',
            type: 'number',
            min: '1',
            value: item.frequency_hours !== null ? String(item.frequency_hours) : '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdate(item.key, 'frequency_hours', e.target.value ? Number(e.target.value) : null),
            placeholder: '8',
            className: 'w-14',
          }),
          h('span', { className: 'text-[12px] text-[var(--cg-text-muted)]' }, 'horas')
        ),
        h(FrequencyChips, {
          value: item.frequency_hours,
          onChange: (v: number) => onUpdate(item.key, 'frequency_hours', v),
        })
      ),
      // Duración
      h(
        'div',
        { className: 'flex flex-col gap-1' },
        h(UI.Label, { className: 'text-[11px]' }, 'Duración'),
        h(
          'div',
          { className: 'flex gap-1' },
          h(UI.Input, {
            size: 'sm',
            type: 'number',
            min: '1',
            value: item.duration_amount !== null ? String(item.duration_amount) : '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdate(item.key, 'duration_amount', e.target.value ? Number(e.target.value) : null),
            placeholder: '7',
            className: 'flex-1',
          }),
          h(
            UI.Select,
            {
              value: item.duration_unit,
              onValueChange: (v: string) => onUpdate(item.key, 'duration_unit', v),
            },
            ...DURATION_UNITS.map((u) => h(UI.SelectItem, { key: u, value: u }, u))
          )
        ),
        h(DurationChips, {
          value: item.duration_amount,
          onChange: (v: number) => onUpdate(item.key, 'duration_amount', v),
        })
      ),
      // Cantidad a dispensar
      h(
        'div',
        { className: 'flex flex-col gap-1' },
        h(UI.Label, { className: 'text-[11px]' }, 'Dispensar'),
        h(UI.Input, {
          size: 'sm',
          type: 'number',
          min: '1',
          value: item.quantity,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            onUpdate(item.key, 'quantity', e.target.value),
          placeholder: calculated || '—',
        }),
        calculated
          ? h(
              'span',
              { className: 'text-[10px] text-[var(--cg-success)]' },
              `Calculado: ${calculated}`
            )
          : null
      )
    )
  );
}
