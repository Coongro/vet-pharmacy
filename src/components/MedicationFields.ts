/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, actions, usePlugin } from '@coongro/plugin-sdk';

import { useMedication } from '../hooks/useMedication.js';
import type { Medication, CreateMedicationData } from '../types/domain.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useCallback } = React;
const h = React.createElement;

interface MedicationFieldsProps {
  productId: string;
}

interface FormState {
  active_ingredient: string;
  concentration: string;
  presentation: string;
  laboratory: string;
  administration_route: string;
  species: string;
  requires_prescription: boolean;
  controlled: boolean;
  senasa_registration: string;
  storage_conditions: string;
}

function buildFormState(med: Medication | null): FormState {
  return {
    active_ingredient: med?.active_ingredient ?? '',
    concentration: med?.concentration ?? '',
    presentation: med?.presentation ?? '',
    laboratory: med?.laboratory ?? '',
    administration_route: med?.administration_route ?? '',
    species: med?.species ? med.species.join(', ') : '',
    requires_prescription: med?.requires_prescription ?? false,
    controlled: med?.controlled ?? false,
    senasa_registration: med?.senasa_registration ?? '',
    storage_conditions: med?.storage_conditions ?? '',
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonField() {
  return h(
    'div',
    { className: 'flex flex-col gap-1' },
    h(UI.Skeleton, { className: 'h-3 w-[40%]' }),
    h(UI.Skeleton, { className: 'h-4 w-[70%]' })
  );
}

function SkeletonGrid() {
  const fields = Array.from({ length: 8 }, (_, i) => h(SkeletonField, { key: i }));
  return h('div', { className: 'grid grid-cols-2 gap-3 gap-x-6' }, ...fields);
}

// ─── Campo de sólo lectura ────────────────────────────────────────────────────

interface ReadFieldProps {
  label: string;
  value: React.ReactNode;
}

function ReadField({ label, value }: ReadFieldProps) {
  return h(
    'div',
    { className: 'flex flex-col gap-1' },
    h(UI.Label, { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' }, label),
    h(
      'span',
      { className: value ? 'text-sm text-cg-text' : 'text-sm text-cg-text-muted italic' },
      value || '—'
    )
  );
}

// ─── Campo de edición ────────────────────────────────────────────────────────

interface EditFieldProps {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (name: keyof FormState, value: string) => void;
}

function EditField({ label, name, value, onChange }: EditFieldProps) {
  return h(
    'div',
    { className: 'flex flex-col gap-1' },
    h(UI.Label, { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' }, label),
    h(UI.Input, {
      size: 'sm',
      type: 'text',
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value),
    })
  );
}

// ─── Campo checkbox de edición ───────────────────────────────────────────────

interface EditCheckboxProps {
  label: string;
  name: keyof FormState;
  checked: boolean;
  onChange: (name: keyof FormState, value: boolean) => void;
}

function EditCheckbox({ label, name, checked, onChange }: EditCheckboxProps) {
  return h(
    'div',
    { className: 'flex flex-col gap-1' },
    h(UI.Label, { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' }, label),
    h(
      'div',
      { className: 'flex items-center gap-2' },
      h(UI.Switch, {
        checked,
        onCheckedChange: (val: boolean) => onChange(name, val),
      }),
      h('span', { className: 'text-sm text-cg-text' }, checked ? 'Sí' : 'No')
    )
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function MedicationFields({ productId }: MedicationFieldsProps) {
  const { toast } = usePlugin();
  const { medication, loading, refetch } = useMedication(productId);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildFormState(null));

  const handleEnterEdit = useCallback(() => {
    setForm(buildFormState(medication));
    setEditMode(true);
  }, [medication]);

  const handleCancel = useCallback(() => {
    setEditMode(false);
  }, []);

  const handleFieldChange = useCallback((name: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const speciesArray = form.species
        ? form.species
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      if (medication) {
        const data: Partial<CreateMedicationData> = {
          active_ingredient: form.active_ingredient,
          concentration: form.concentration || null,
          presentation: form.presentation || null,
          laboratory: form.laboratory || null,
          administration_route: form.administration_route || null,
          species: speciesArray.length > 0 ? speciesArray : null,
          requires_prescription: form.requires_prescription,
          controlled: form.controlled,
          senasa_registration: form.senasa_registration || null,
          storage_conditions: form.storage_conditions || null,
        };
        await actions.execute('vet-pharmacy.medications.update', {
          id: medication.id,
          data,
        });
        toast.success('Guardado', 'Datos farmacéuticos actualizados');
      } else {
        const data: CreateMedicationData = {
          product_id: productId,
          active_ingredient: form.active_ingredient,
          concentration: form.concentration || null,
          presentation: form.presentation || null,
          laboratory: form.laboratory || null,
          administration_route: form.administration_route || null,
          species: speciesArray.length > 0 ? speciesArray : null,
          requires_prescription: form.requires_prescription,
          controlled: form.controlled,
          senasa_registration: form.senasa_registration || null,
          storage_conditions: form.storage_conditions || null,
        };
        await actions.execute('vet-pharmacy.medications.create', { data });
        toast.success('Guardado', 'Datos farmacéuticos creados');
      }

      await refetch();
      setEditMode(false);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }, [form, medication, productId, refetch, toast]);

  // ─── Render: cargando ────────────────────────────────────────────────────

  if (loading) {
    return h(
      UI.Card,
      null,
      h(UI.CardHeader, null, h(UI.CardTitle, null, 'Datos farmacéuticos')),
      h(UI.CardBody, null, h(SkeletonGrid, null))
    );
  }

  // ─── Render: sin datos y sin modo edición ────────────────────────────────

  if (!medication && !editMode) {
    return h(
      UI.Card,
      null,
      h(UI.CardHeader, null, h(UI.CardTitle, null, 'Datos farmacéuticos')),
      h(
        UI.CardBody,
        null,
        h(UI.EmptyState, {
          title: 'Sin datos farmacéuticos',
          action: h(
            UI.Button,
            {
              variant: 'default',
              size: 'sm',
              onClick: () => {
                setForm(buildFormState(null));
                setEditMode(true);
              },
            },
            'Agregar datos farmacéuticos'
          ),
        })
      )
    );
  }

  // ─── Render: modo edición ────────────────────────────────────────────────

  if (editMode) {
    return h(
      UI.Card,
      null,
      h(
        UI.CardHeader,
        { className: 'flex flex-row items-center justify-between' },
        h(UI.CardTitle, null, 'Datos farmacéuticos'),
        h('span', { className: 'text-xs text-cg-text-muted' }, 'Editando')
      ),
      h(
        UI.CardBody,
        null,
        h(
          'div',
          { className: 'grid grid-cols-2 gap-3 gap-x-6' },
          h(EditField, {
            key: 'active_ingredient',
            label: 'Principio activo',
            name: 'active_ingredient',
            value: form.active_ingredient,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditField, {
            key: 'concentration',
            label: 'Concentración',
            name: 'concentration',
            value: form.concentration,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditField, {
            key: 'presentation',
            label: 'Presentación',
            name: 'presentation',
            value: form.presentation,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditField, {
            key: 'laboratory',
            label: 'Laboratorio',
            name: 'laboratory',
            value: form.laboratory,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditField, {
            key: 'administration_route',
            label: 'Vía de administración',
            name: 'administration_route',
            value: form.administration_route,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditField, {
            key: 'species',
            label: 'Especies destino (separadas por coma)',
            name: 'species',
            value: form.species,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditCheckbox, {
            key: 'requires_prescription',
            label: 'Requiere receta',
            name: 'requires_prescription',
            checked: form.requires_prescription,
            onChange: handleFieldChange as (name: keyof FormState, value: boolean) => void,
          }),
          h(EditCheckbox, {
            key: 'controlled',
            label: 'Controlado',
            name: 'controlled',
            checked: form.controlled,
            onChange: handleFieldChange as (name: keyof FormState, value: boolean) => void,
          }),
          h(EditField, {
            key: 'senasa_registration',
            label: 'Registro SENASA',
            name: 'senasa_registration',
            value: form.senasa_registration,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          }),
          h(EditField, {
            key: 'storage_conditions',
            label: 'Condiciones de almacenamiento',
            name: 'storage_conditions',
            value: form.storage_conditions,
            onChange: handleFieldChange as (name: keyof FormState, value: string) => void,
          })
        )
      ),
      h(
        UI.CardFooter,
        { className: 'flex justify-end gap-2' },
        h(
          UI.Button,
          {
            variant: 'default',
            size: 'sm',
            onClick: handleSave,
            disabled: saving,
          },
          saving ? 'Guardando...' : 'Guardar'
        ),
        h(
          UI.Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: handleCancel,
            disabled: saving,
          },
          'Cancelar'
        )
      )
    );
  }

  // ─── Render: modo lectura ────────────────────────────────────────────────

  const med = medication;

  return h(
    UI.Card,
    null,
    h(
      UI.CardHeader,
      { className: 'flex flex-row items-center justify-between' },
      h(UI.CardTitle, null, 'Datos farmacéuticos'),
      h(UI.Button, { variant: 'default', size: 'sm', onClick: handleEnterEdit }, 'Editar')
    ),
    h(
      UI.CardBody,
      null,
      h(
        'div',
        { className: 'grid grid-cols-2 gap-3 gap-x-6' },
        h(ReadField, {
          key: 'active_ingredient',
          label: 'Principio activo',
          value: med.active_ingredient,
        }),
        h(ReadField, {
          key: 'concentration',
          label: 'Concentración',
          value: med.concentration,
        }),
        h(ReadField, {
          key: 'presentation',
          label: 'Presentación',
          value: med.presentation,
        }),
        h(ReadField, {
          key: 'laboratory',
          label: 'Laboratorio',
          value: med.laboratory,
        }),
        h(ReadField, {
          key: 'administration_route',
          label: 'Vía de administración',
          value: med.administration_route,
        }),
        h(ReadField, {
          key: 'species',
          label: 'Especies destino',
          value: med.species && med.species.length > 0 ? med.species.join(', ') : null,
        }),
        h(
          'div',
          { key: 'requires_prescription', className: 'flex flex-col gap-1' },
          h(
            UI.Label,
            { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' },
            'Requiere receta'
          ),
          h(
            UI.Badge,
            { variant: med.requires_prescription ? 'success-soft' : 'secondary' },
            med.requires_prescription ? 'Sí' : 'No'
          )
        ),
        h(
          'div',
          { key: 'controlled', className: 'flex flex-col gap-1' },
          h(
            UI.Label,
            { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' },
            'Controlado'
          ),
          h(
            UI.Badge,
            { variant: med.controlled ? 'success-soft' : 'secondary' },
            med.controlled ? 'Sí' : 'No'
          )
        ),
        h(ReadField, {
          key: 'senasa_registration',
          label: 'Registro SENASA',
          value: med.senasa_registration,
        }),
        h(ReadField, {
          key: 'storage_conditions',
          label: 'Condiciones de almacenamiento',
          value: med.storage_conditions,
        })
      )
    )
  );
}
