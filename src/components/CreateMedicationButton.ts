/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Botón para crear medicamento. Abre un modal con formulario combinado
 * que crea un producto + registro de medicamento en un solo flujo.
 */
import { getHostReact, getHostUI, actions, usePlugin } from '@coongro/plugin-sdk';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useCallback } = React;
const h = React.createElement;

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreateMedicationButtonProps {
  onSuccess?: () => void;
}

interface FormState {
  // Producto
  name: string;
  description: string;
  sale_price: string;
  // Farmacia
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

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  sale_price: '',
  active_ingredient: '',
  concentration: '',
  presentation: '',
  laboratory: '',
  administration_route: '',
  species: '',
  requires_prescription: false,
  controlled: false,
  senasa_registration: '',
  storage_conditions: '',
};

const ROUTES = ['Oral', 'Inyectable', 'Tópica', 'Oftálmica', 'Ótica', 'Inhalatoria', 'Rectal'];

// ─── Componente ─────────────────────────────────────────────────────────────

export function CreateMedicationButton({ onSuccess }: CreateMedicationButtonProps) {
  const { toast } = usePlugin();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev: FormState) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast.warning('Campo requerido', 'El nombre del medicamento es obligatorio');
      return;
    }
    if (!form.active_ingredient.trim()) {
      toast.warning('Campo requerido', 'El principio activo es obligatorio');
      return;
    }

    setSaving(true);
    try {
      // 1. Crear producto
      const rows = await actions.execute<Array<{ id: string }>>('products.items.create', {
        data: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          // Precio de venta: lo necesita el cobro (consulta/mostrador). Sin esto el medicamento
          // entraba al cobro en $0.
          sale_price: form.sale_price.trim() ? form.sale_price.trim() : undefined,
        },
      });
      const productId = rows?.[0]?.id;
      if (!productId) {
        toast.error('Error', 'No se pudo crear el producto');
        return;
      }

      // 2. Crear registro farmacéutico
      await actions.execute('vet-pharmacy.medications.create', {
        data: {
          product_id: productId,
          active_ingredient: form.active_ingredient.trim(),
          concentration: form.concentration.trim() || null,
          presentation: form.presentation.trim() || null,
          laboratory: form.laboratory.trim() || null,
          administration_route: form.administration_route || null,
          species: form.species.trim()
            ? form.species
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : null,
          requires_prescription: form.requires_prescription,
          controlled: form.controlled,
          senasa_registration: form.senasa_registration.trim() || null,
          storage_conditions: form.storage_conditions.trim() || null,
        },
      });

      toast.success('Medicamento creado', `${form.name} fue registrado exitosamente`);
      setForm(EMPTY_FORM);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al crear medicamento');
    } finally {
      setSaving(false);
    }
  }, [form, toast, onSuccess]);

  const canSubmit = form.name.trim() && form.active_ingredient.trim() && !saving;

  // ─── Helpers de render ────────────────────────────────────────────────────

  function textField(
    label: string,
    field: keyof FormState,
    opts?: { placeholder?: string; required?: boolean }
  ) {
    return h(
      'div',
      null,
      h(
        UI.Label,
        null,
        label,
        opts?.required ? h('span', { className: 'text-[var(--cg-error)]' }, ' *') : null
      ),
      h(UI.Input, {
        size: 'sm',
        value: form[field] as string,
        placeholder: opts?.placeholder ?? '',
        onChange: (e: { target: { value: string } }) =>
          updateField(field, e.target.value as FormState[typeof field]),
      })
    );
  }

  function switchField(label: string, field: 'requires_prescription' | 'controlled') {
    return h(
      'label',
      { className: 'flex items-center gap-2 cursor-pointer' },
      h(UI.Switch, {
        checked: form[field],
        onCheckedChange: (checked: boolean) => updateField(field, checked),
      }),
      h('span', { className: 'text-sm text-[var(--cg-text)]' }, label)
    );
  }

  // ─── Footer del FormDialog ───────────────────────────────────────────────

  const footer = h(
    React.Fragment,
    null,
    h(UI.Button, { variant: 'outline', onClick: () => setOpen(false) }, 'Cancelar'),
    h(
      UI.Button,
      {
        disabled: !canSubmit,
        onClick: () => void handleSubmit(),
      },
      saving ? 'Guardando...' : 'Crear medicamento'
    )
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return h(
    React.Fragment,
    null,
    // Botón trigger
    h(
      UI.Button,
      { onClick: () => setOpen(true) },
      h(UI.DynamicIcon, { icon: 'Plus', size: 16 }),
      'Nuevo medicamento'
    ),
    // FormDialog
    h(
      UI.FormDialog,
      {
        open,
        onOpenChange: (v: boolean) => {
          if (!v) setOpen(false);
        },
        title: 'Nuevo medicamento',
        footer,
        size: 'md',
      },
      h(
        'div',
        { className: 'space-y-4' },
        // Sección: Producto
        h(
          'div',
          { className: 'space-y-3' },
          h(
            'div',
            {
              className: 'text-sm font-medium text-[var(--cg-text-muted)] uppercase tracking-wider',
            },
            'Información básica'
          ),
          textField('Nombre', 'name', {
            placeholder: 'Ej: Enrofloxacina 50mg/ml',
            required: true,
          }),
          h(
            'div',
            { className: 'grid grid-cols-2 gap-3' },
            textField('Descripción', 'description', { placeholder: 'Opcional' }),
            textField('Precio de venta', 'sale_price', { placeholder: 'Ej: 1500' })
          )
        ),
        h(UI.Separator, null),
        // Sección: Farmacia
        h(
          'div',
          { className: 'space-y-3' },
          h(
            'div',
            {
              className: 'text-sm font-medium text-[var(--cg-text-muted)] uppercase tracking-wider',
            },
            'Datos farmacéuticos'
          ),
          textField('Principio activo', 'active_ingredient', {
            placeholder: 'Ej: Enrofloxacina',
            required: true,
          }),
          h(
            'div',
            { className: 'grid grid-cols-2 gap-3' },
            textField('Concentración', 'concentration', { placeholder: 'Ej: 50mg/ml' }),
            textField('Presentación', 'presentation', { placeholder: 'Ej: Frasco 100ml' })
          ),
          h(
            'div',
            { className: 'grid grid-cols-2 gap-3' },
            textField('Laboratorio', 'laboratory', { placeholder: 'Ej: Holliday' }),
            // Vía de administración
            h(
              'div',
              null,
              h(UI.Label, null, 'Vía de administración'),
              h(
                UI.Select,
                {
                  value: form.administration_route,
                  onValueChange: (v: string) => updateField('administration_route', v),
                  placeholder: 'Seleccionar...',
                  clearable: true,
                },
                ...ROUTES.map((r) => h(UI.SelectItem, { key: r, value: r.toLowerCase() }, r))
              )
            )
          ),
          textField('Especies destino', 'species', {
            placeholder: 'Ej: canino, felino, equino',
          }),
          h(
            'div',
            { className: 'grid grid-cols-2 gap-3' },
            switchField('Requiere receta', 'requires_prescription'),
            switchField('Controlado SENASA', 'controlled')
          ),
          textField('Registro SENASA', 'senasa_registration', {
            placeholder: 'Nro. de registro (opcional)',
          }),
          textField('Condiciones de almacenamiento', 'storage_conditions', {
            placeholder: 'Ej: Refrigerar 2-8°C',
          })
        )
      )
    )
  );
}
