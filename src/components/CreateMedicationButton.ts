/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
/**
 * Botón + modal de alta de medicamento (COONG-218).
 *
 * Punto de entrada recomendado: el buscador del vademécum SENASA (acciones
 * `vademecum.catalog.*`, provistas por el plugin provider). Al elegir un
 * producto se autocompleta casi toda la ficha clínica con badges "Completado
 * desde SENASA"; el vet solo carga precio y régimen de receta. Si el provider
 * no está instalado (otro país), el buscador avisa que no está disponible y se
 * usa la carga manual (gating por país).
 *
 * Campos estructurados como en el diseño: principio activo (combobox) +
 * concentración con unidad, presentación (tipo + tamaño + unidad), clasificación
 * y vía como selectores, especies como chips. La composición se guarda como
 * lista en `medication_components`. Reutiliza componentes de
 * @coongro/ui-components; el CSS propio del diseño vive en tailwind.css (.vp-meds).
 */
import { getHostReact, getHostUI, actions, usePlugin, useSettings } from '@coongro/plugin-sdk';
import { CatalogSearch, LaboratorySelect, useLaboratories } from '@coongro/vademecum';
import type { CatalogProductDetail, CatalogProductSummary } from '@coongro/vademecum';

import {
  SPECIES,
  SPECIES_LABELS as SPECIES_LABEL,
  SPECIES_ENABLED_DEFAULT,
  speciesCodeFromText as senasaSpeciesToCode,
} from '@coongro/patients';

import type { Medication } from '../types/domain.js';

const React = getHostReact();
const UI = getHostUI();
const { useState, useCallback, useEffect, useMemo } = React;
const h = React.createElement;

// ─── Catálogos (del diseño) ──────────────────────────────────────────────────

const ROUTES = ['Oral', 'Inyectable', 'Tópica', 'Oftálmica', 'Ótica', 'Inhalatoria', 'Rectal'];
const CONC_UNITS = ['mg/ml', 'mg', 'g', '%', 'UI/ml', 'mg/g', 'mcg/ml'];
const PRES_TYPES = [
  'Comprimido',
  'Cápsula',
  'Frasco/Vial',
  'Ampolla',
  'Jeringa precargada',
  'Pipeta/Spot-on',
  'Pomo/Crema',
  'Suspensión',
  'Sobre/Polvo',
  'Gotas',
  'Spray',
  'Collar',
];
const PRES_UNITS = ['ml', 'g', 'mg', 'comp.', 'cáps.', 'dosis', 'u.'];
// Especies: taxonomía compartida (code/label/icon) en @coongro/patients. Se
// guarda el CODE; las habilitadas se leen de los settings del tenant.
const CLASSIFICATIONS = ['Fármaco', 'Biológico / Vacuna'];

// ─── Estado del form ─────────────────────────────────────────────────────────

interface CompRow {
  substance: string;
  concVal: string;
  concUnit: string;
  /** Origen del componente (ej. 'senasa'); se preserva al editar. */
  source?: string | null;
}
interface FormState {
  components: CompRow[];
  presType: string;
  presSize: string;
  presUnit: string;
  classification: string;
  laboratory_id: string;
  administration_route: string;
  species: string[];
  indications: string;
  requires_prescription: boolean;
  controlled: boolean;
  senasa_registration: string;
  sale_price: string;
}

const EMPTY_FORM: FormState = {
  components: [{ substance: '', concVal: '', concUnit: 'mg/ml' }],
  presType: '',
  presSize: '',
  presUnit: 'ml',
  classification: '',
  laboratory_id: '',
  administration_route: '',
  species: [],
  indications: '',
  requires_prescription: false,
  controlled: false,
  senasa_registration: '',
  sale_price: '',
};

interface CreateMedicationButtonProps {
  onSuccess?: () => void;
  /**
   * Edición: si se pasa un medicamento, el modal se abre en modo editar (control
   * externo, sin el botón). null/undefined = modo alta normal (con botón).
   */
  editMedication?: Medication | null;
  /** Se llama al cerrar el modal en modo edición. */
  onEditClose?: () => void;
  /**
   * Catálogo vivo: valores ya usados en el tenant (combobox y selectores). Se
   * combinan con los defaults para que todo valor cargado antes —de SENASA o
   * manual— quede disponible para reusar. El consumidor (la vista) los deriva de
   * los medicamentos existentes.
   */
  paOptions?: string[];
  extraRoutes?: string[];
  extraClassifications?: string[];
  extraPresTypes?: string[];
  extraPresUnits?: string[];
}

/** Especies del producto para el dropdown: SENASA → labels de Pacientes, sin repetir. */
function compactSpecies(species: string[]): string {
  return [...new Set(species.map((s) => SPECIES_LABEL[senasaSpeciesToCode(s)]))].join(', ');
}

/** Une defaults + extras del catálogo vivo, sin duplicar y preservando orden. */
function withLive(defaults: string[], extra: string[] = []): string[] {
  const seen = new Set(defaults.map((d) => d.toLowerCase()));
  const merged = [...defaults];
  for (const e of extra) {
    const v = e.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      merged.push(v);
    }
  }
  return merged;
}

function presString(f: FormState): string {
  if (!f.presType) return '';
  if (!f.presSize.trim()) return f.presType;
  const spaced = ['comp.', 'cáps.', 'dosis', 'u.'].includes(f.presUnit);
  return `${f.presType} ${f.presSize}${spaced ? ' ' : ''}${f.presUnit}`;
}
function composeName(f: FormState): string {
  const c0 = f.components[0];
  const head = [c0?.substance.trim(), c0?.concVal.trim() ? `${c0.concVal}${c0.concUnit}` : '']
    .filter(Boolean)
    .join(' ');
  const pres = presString(f);
  return pres ? (head ? `${head} · ${pres}` : pres) : head;
}

export function CreateMedicationButton({
  onSuccess,
  editMedication = null,
  onEditClose,
  paOptions = [],
  extraRoutes = [],
  extraClassifications = [],
  extraPresTypes = [],
  extraPresUnits = [],
}: CreateMedicationButtonProps) {
  const isEdit = !!editMedication;
  // Catálogos combinados (defaults + lo ya usado en el tenant).
  const routeOpts = withLive(ROUTES, extraRoutes);
  const classificationOpts = withLive(CLASSIFICATIONS, extraClassifications);
  const presTypeOpts = withLive(PRES_TYPES, extraPresTypes);
  const presUnitOpts = withLive(PRES_UNITS, extraPresUnits);
  // Especies habilitadas del tenant: misma config viva que Pacientes, leída por
  // settings del SDK (no se importa el frontend de patients). Si el tenant habilita
  // o deshabilita una especie en Configuración, se refleja acá.
  const { values: speciesSettings } = useSettings('patients.');
  const enabledSpecies = SPECIES.filter((s) => {
    const v = speciesSettings[`patients.species.${s.code}`];
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return SPECIES_ENABLED_DEFAULT[s.code];
  });
  const { toast } = usePlugin();
  // Maestro de laboratorios compartido (vademecum): el nombre se resuelve por id
  // para denormalizarlo en el medicamento al guardar (COONG-219).
  const { laboratories, refetch: refetchLabs } = useLaboratories();
  const labNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const lab of laboratories) map.set(lab.id, lab.name);
    return map;
  }, [laboratories]);
  // Upsert del laboratorio por nombre en el maestro y devuelve su id. Aislado del
  // handler de autofill para no anidar try/if de más (max-depth). Si vademecum no
  // está disponible, devuelve null y el lab se elige manualmente.
  const resolveLabId = useCallback(
    async (name: string, taxId?: string, country?: string): Promise<string | null> => {
      try {
        const lab = await actions.execute<{ id: string }>('vademecum.laboratories.ensureByName', {
          name,
          taxId,
          country,
          source: 'senasa',
        });
        return lab?.id ?? null;
      } catch {
        return null;
      }
    },
    []
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [name, setName] = useState('');
  const [nameDirty, setNameDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Edición: producto y componentes existentes (para update + reconciliación).
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editOldComponentIds, setEditOldComponentIds] = useState<string[]>([]);
  // Confirmación de borrado (dialog de ui-components, no window.confirm).
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Producto elegido del vademécum: controla la tarjeta "seleccionado" del
  // buscador compartido y los badges "Completado desde SENASA" del form. La
  // mecánica de búsqueda (query, debounce, dropdown, gating) vive en
  // <CatalogSearch> (@coongro/vademecum); acá solo se reacciona a la selección.
  const [senaSelected, setSenaSelected] = useState<CatalogProductDetail | null>(null);
  const [senaCollapsed, setSenaCollapsed] = useState(false);

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setName('');
    setNameDirty(false);
    setSenaSelected(null);
    setSenaCollapsed(false);
  }, []);

  useEffect(() => {
    if (!nameDirty) setName(composeName(form));
  }, [form, nameDirty]);

  // Cargar el medicamento a editar: campos directos + componentes (fetch) +
  // nombre/precio del producto (fetch). En edición se oculta el buscador SENASA.
  useEffect(() => {
    if (!editMedication) return;
    let active = true;
    void (async () => {
      let comps: CompRow[] = [];
      let oldIds: string[] = [];
      try {
        const all = await actions.execute<
          Array<{
            id: string;
            medication_id: string;
            substance: string;
            amount: string | null;
            unit: string | null;
            source: string | null;
          }>
        >('vet-pharmacy.medication-components.list');
        const mine = (all ?? []).filter((c) => c.medication_id === editMedication.id);
        oldIds = mine.map((c) => c.id);
        comps = mine.map((c) => ({
          substance: c.substance,
          concVal: c.amount ?? '',
          concUnit: c.unit ?? 'mg/ml',
          source: c.source,
        }));
      } catch {
        /* sin componentes */
      }
      if (comps.length === 0)
        comps = [{ substance: editMedication.active_ingredient, concVal: '', concUnit: 'mg/ml' }];

      let prodName = editMedication.active_ingredient;
      let salePrice = '';
      try {
        const prods =
          await actions.execute<Array<{ id: string; name: string; sale_price: string | null }>>(
            'products.items.list'
          );
        const p = (prods ?? []).find((x) => x.id === editMedication.product_id);
        if (p) {
          prodName = p.name;
          salePrice = p.sale_price ?? '';
        }
      } catch {
        /* sin producto */
      }
      if (!active) return;

      const meta = (editMedication.metadata ?? {}) as {
        classification?: string;
        presentationType?: string;
        presentationUnit?: string;
        presentationSize?: string;
        indications?: string;
      };
      setEditProductId(editMedication.product_id);
      setEditOldComponentIds(oldIds);
      setForm({
        components: comps,
        presType: meta.presentationType ?? '',
        presSize: meta.presentationSize ?? '',
        presUnit: meta.presentationUnit ?? 'ml',
        classification: meta.classification ?? '',
        laboratory_id: editMedication.laboratory_id ?? '',
        administration_route: editMedication.administration_route ?? '',
        species: Array.isArray(editMedication.species) ? editMedication.species : [],
        indications: meta.indications ?? '',
        requires_prescription: !!editMedication.requires_prescription,
        controlled: !!editMedication.controlled,
        senasa_registration: editMedication.senasa_registration ?? '',
        sale_price: salePrice,
      });
      setName(prodName);
      setNameDirty(true);
      setSenaSelected(null);
      setSenaCollapsed(true);

      // Auto-migración del laboratorio en texto libre (datos previos a COONG-219):
      // si el medicamento tiene `laboratory` (texto) pero no `laboratory_id`, se
      // materializa en el maestro compartido y se prefilla el id, para que el
      // selector lo muestre y al guardar quede referenciado. Idempotente
      // (ensureByName deduplica). Sin esto, el form mostraría el lab vacío.
      if (!editMedication.laboratory_id && editMedication.laboratory?.trim()) {
        try {
          const lab = await actions.execute<{ id: string }>('vademecum.laboratories.ensureByName', {
            name: editMedication.laboratory,
          });
          if (active && lab?.id) setForm((prev) => ({ ...prev, laboratory_id: lab.id }));
        } catch {
          /* el vet puede elegir el laboratorio manualmente */
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [editMedication]);

  const update = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev: FormState) => ({ ...prev, [field]: value }));
  }, []);

  const setComp = (i: number, key: keyof CompRow, val: string) =>
    setForm((prev) => ({
      ...prev,
      components: prev.components.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)),
    }));
  const addComp = () =>
    setForm((prev) => ({
      ...prev,
      components: [...prev.components, { substance: '', concVal: '', concUnit: 'mg/ml' }],
    }));
  const removeComp = (i: number) =>
    setForm((prev) => ({
      ...prev,
      components:
        prev.components.length > 1
          ? prev.components.filter((_, idx) => idx !== i)
          : prev.components,
    }));

  const toggleSpecies = (s: string) =>
    setForm((prev) => ({
      ...prev,
      species: prev.species.includes(s)
        ? prev.species.filter((x) => x !== s)
        : [...prev.species, s],
    }));

  const setControlado = (v: boolean) =>
    setForm((prev) => ({
      ...prev,
      controlled: v,
      requires_prescription: v ? true : prev.requires_prescription,
    }));

  // Autofill: el buscador compartido ya resolvió la ficha completa; acá solo se
  // mapea el modelo común al form de medicamento (principio activo + presentación
  // + vía + especies…). El mapeo es propio de Farmacia; Vacunación mapea distinto.
  const handleSelect = useCallback(
    async (detail: CatalogProductDetail) => {
      try {
        const comps: CompRow[] =
          detail.composition.length > 0
            ? detail.composition.map((c) => ({
                substance: c.substance,
                concVal: typeof c.amount === 'number' ? String(c.amount) : (c.rawStrength ?? ''),
                concUnit: c.unit && CONC_UNITS.includes(c.unit) ? c.unit : 'mg/ml',
              }))
            : [{ substance: '', concVal: '', concUnit: 'mg/ml' }];
        // Los datos de SENASA vienen en formato libre (mayúsculas, plurales, vías
        // compuestas), así que se matchean de forma FLEXIBLE contra los catálogos
        // del form (no por igualdad exacta).
        const routes = detail.administrationRoutes ?? [];
        // Match flexible contra el catálogo; si SENASA usa un término descriptivo
        // que no matchea (ej. "Instilación ocular" → no contiene "Oftálmica"), se
        // usa el valor crudo en vez de dejar la vía vacía (el selector tolerante lo
        // agrega como opción). Mismo criterio que presentación/clasificación.
        const route =
          ROUTES.find((r) => routes.some((v) => v.toLowerCase().includes(r.toLowerCase()))) ??
          routes[0]?.trim() ??
          '';

        // Presentación: se parsea el texto compuesto (ej. "ESTÉRIL - LÍQUIDO -
        // SUSPENSIÓN · 100 ml") — el tipo por palabra clave, y tamaño+unidad por regex.
        // El tipo de SENASA viene como "NO ESTÉRIL - LÍQUIDO - SOLUCIÓN": la forma
        // farmacéutica es la última parte. Se matchea contra el catálogo; si no
        // está (ej. "Solución"), se usa el valor crudo capitalizado (el selector
        // tolerante lo agrega como opción).
        const presTypeStr = (
          detail.presentationType ?? (detail.presentation ?? '').split('·')[0]
        ).trim();
        const presForm =
          presTypeStr
            .split('-')
            .map((s) => s.trim())
            .filter(Boolean)
            .pop() ?? '';
        const presFormCap = presForm
          ? presForm.charAt(0).toUpperCase() + presForm.slice(1).toLowerCase()
          : '';
        const presLower = presTypeStr.toLowerCase();
        const presType =
          PRES_TYPES.find((t) => presFormCap.toLowerCase() === t.toLowerCase()) ?? presFormCap;
        const sizeMatch = (detail.presentation ?? '').match(
          /(\d+(?:[.,]\d+)?)\s*(ml|mg|g|comp\.?|c[aá]ps\.?|dosis|u\.?)/i
        );
        const presSize = detail.presentationSize ?? (sizeMatch ? sizeMatch[1] : '');
        const matchedUnit = sizeMatch?.[2]?.toLowerCase();
        const presUnit = matchedUnit
          ? (PRES_UNITS.find((u) => u.toLowerCase().startsWith(matchedUnit.replace('.', ''))) ??
            'ml')
          : /comprimido|s[oó]lido|c[aá]psula|sobre|polvo/.test(presLower)
            ? 'comp.'
            : 'ml';

        // Especies: SENASA ("BOVINOS", "CANINOS"…) → códigos de Pacientes; solo se
        // marcan las habilitadas en el tenant (las demás no tienen chip disponible).
        const enabledCodes = new Set(enabledSpecies.map((s) => s.code));
        const species = [
          ...new Set(
            (detail.species ?? []).map(senasaSpeciesToCode).filter((c) => enabledCodes.has(c))
          ),
        ];

        setForm((prev) => ({
          ...prev,
          components: comps,
          administration_route: route,
          presType,
          presSize,
          presUnit,
          species,
          indications: detail.indications ?? '',
          classification:
            detail.classification && /biol|vacuna/i.test(detail.classification)
              ? 'Biológico / Vacuna'
              : detail.classification
                ? 'Fármaco'
                : '',
          senasa_registration: detail.registrationNumber ?? '',
        }));
        setName(detail.commercialName || '');
        setNameDirty(true);
        setSenaSelected(detail);

        // Auto-upsert del laboratorio en el maestro compartido (COONG-219): el
        // autofill trae el nombre de la firma; se materializa una sola vez en el
        // maestro y se referencia por id (ver resolveLabId).
        const labId = detail.laboratory
          ? await resolveLabId(detail.laboratory, detail.laboratoryTaxId, detail.country)
          : null;
        if (labId) {
          setForm((prev) => ({ ...prev, laboratory_id: labId }));
          // Refrescar el maestro local para que el nombre denormalizado que se
          // guarda (labNameById) incluya el lab recién creado por el autofill.
          await refetchLabs();
        }
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo aplicar el autofill');
      }
    },
    [toast, resolveLabId, refetchLabs]
  );

  const handleSubmit = useCallback(async () => {
    const comps = form.components
      .map((c) => ({ ...c, substance: c.substance.trim() }))
      .filter((c) => c.substance);
    if (!name.trim()) {
      toast.warning('Campo requerido', 'El nombre del medicamento es obligatorio');
      return;
    }
    if (comps.length === 0) {
      toast.warning('Campo requerido', 'Al menos un principio activo es obligatorio');
      return;
    }

    const medData = {
      active_ingredient: comps[0].substance,
      concentration: comps[0].concVal.trim() ? `${comps[0].concVal}${comps[0].concUnit}` : null,
      presentation: presString(form) || null,
      laboratory_id: form.laboratory_id || null,
      laboratory: form.laboratory_id ? (labNameById.get(form.laboratory_id) ?? null) : null,
      administration_route: form.administration_route || null,
      species: form.species.length ? form.species : null,
      requires_prescription: form.requires_prescription,
      controlled: form.controlled,
      senasa_registration: form.senasa_registration.trim() || null,
      // storage_conditions no se incluye: el form no lo expone, así que omitirlo
      // evita pisar con null un valor cargado por otra vía al editar.
      metadata: {
        // Preserva claves de metadata que el form no maneja (puestas por otra vía
        // o una versión futura): el update hace replace, no merge, así que sin esto
        // editar desde acá las borraría. Mismo criterio que storage_conditions.
        ...(editMedication?.metadata ?? {}),
        ...(form.classification ? { classification: form.classification } : {}),
        ...(form.presType ? { presentationType: form.presType } : {}),
        ...(form.presUnit ? { presentationUnit: form.presUnit } : {}),
        ...(form.presSize ? { presentationSize: form.presSize } : {}),
        ...(form.indications.trim() ? { indications: form.indications.trim() } : {}),
      },
    };
    const compData = (medicationId: string) =>
      comps.map((c, i) => ({
        medication_id: medicationId,
        substance: c.substance,
        amount: c.concVal.trim() ? c.concVal.trim().replace(',', '.') : null,
        unit: c.concUnit || null,
        raw_strength: c.concVal.trim() ? `${c.concVal}${c.concUnit}` : null,
        // En alta: 'senasa' si vino del buscador. En edición: se preserva el
        // origen original del componente (senaSelected es null al editar).
        source: c.source ?? (senaSelected ? 'senasa' : null),
        // Orden estable (0 = principal). Define cuál es el active_ingredient.
        position: i,
      }));

    setSaving(true);
    try {
      // ── Modo edición: actualizar producto + medication, y reconciliar
      // componentes. ──
      if (isEdit && editMedication && editProductId) {
        await actions.execute('products.items.update', {
          id: editProductId,
          // null (no undefined) para poder limpiar el precio: undefined haría que
          // update lo ignore y quede el valor anterior.
          data: { name: name.trim(), sale_price: form.sale_price.trim() || null },
        });
        await actions.execute('vet-pharmacy.medications.update', {
          id: editMedication.id,
          data: medData,
        });
        // Reconciliación de componentes: crear los nuevos PRIMERO y recién después
        // borrar los viejos por id. Estas acciones no son transaccionales entre sí;
        // en este orden, un fallo a mitad deja componentes de más (recuperable,
        // editable de nuevo) en vez de dejar el medicamento sin composición (data
        // loss, que además el fallback de carga enmascararía). El fix de raíz sería
        // una acción de reemplazo atómico en el backend (ticket aparte).
        await Promise.all(
          compData(editMedication.id).map((data) =>
            actions.execute('vet-pharmacy.medication-components.create', { data })
          )
        );
        await Promise.all(
          editOldComponentIds.map((id) =>
            actions.execute('vet-pharmacy.medication-components.delete', { id })
          )
        );
        toast.success('Medicamento actualizado', `${name.trim()} fue actualizado`);
        onEditClose?.();
        onSuccess?.();
        return;
      }

      const rows = await actions.execute<Array<{ id: string }>>('products.items.create', {
        data: { name: name.trim(), sale_price: form.sale_price.trim() || undefined },
      });
      const productId = rows?.[0]?.id;
      if (!productId) {
        toast.error('Error', 'No se pudo crear el producto');
        return;
      }

      const medRows = await actions.execute<Array<{ id: string }>>(
        'vet-pharmacy.medications.create',
        {
          data: { product_id: productId, ...medData },
        }
      );
      const medicationId = medRows?.[0]?.id;

      if (medicationId) {
        await Promise.all(
          compData(medicationId).map((data) =>
            actions.execute('vet-pharmacy.medication-components.create', { data })
          )
        );
      }

      toast.success('Medicamento creado', `${name.trim()} fue registrado`);
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al crear medicamento');
    } finally {
      setSaving(false);
    }
  }, [
    form,
    name,
    senaSelected,
    toast,
    onSuccess,
    reset,
    isEdit,
    editMedication,
    editProductId,
    editOldComponentIds,
    onEditClose,
  ]);

  // Eliminar (solo en edición): borra componentes + medication + producto. Pide
  // confirmación porque es destructivo.
  const handleDelete = useCallback(async () => {
    if (!editMedication) return;
    setSaving(true);
    try {
      await Promise.all(
        editOldComponentIds.map((id) =>
          actions.execute('vet-pharmacy.medication-components.delete', { id })
        )
      );
      await actions.execute('vet-pharmacy.medications.delete', { id: editMedication.id });
      if (editProductId) await actions.execute('products.items.delete', { id: editProductId });
      toast.success('Medicamento eliminado', `${name.trim()} fue eliminado`);
      setConfirmDelete(false);
      onEditClose?.();
      onSuccess?.();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  }, [editMedication, editOldComponentIds, editProductId, name, toast, onEditClose, onSuccess]);

  // ─── Render helpers ────────────────────────────────────────────────────────

  const senaTag = () =>
    senaSelected
      ? h(
          'span',
          { className: 'sena-tag' },
          h(UI.DynamicIcon, { icon: 'Check', size: 9 }),
          'SENASA'
        )
      : null;

  // Combobox de core con sugerencias + crear nuevo.
  function combo(
    value: string,
    onChange: (v: string) => void,
    options: string[],
    placeholder: string
  ) {
    return h(
      UI.Combobox,
      { value, onValueChange: onChange },
      h(UI.ComboboxChipTrigger, { placeholder }),
      h(
        UI.ComboboxContent,
        null,
        h(UI.ComboboxEmpty, null, 'Escribí para crear uno nuevo'),
        ...options.map((o) => h(UI.ComboboxItem, { key: o, value: o }, o)),
        h(UI.ComboboxCreate, { onCreate: (s: string) => onChange(s) })
      )
    );
  }
  function select(
    value: string,
    onChange: (v: string) => void,
    options: string[],
    placeholder: string
  ) {
    // Selector TOLERANTE: si el valor (típicamente autocompletado desde SENASA)
    // no está en el catálogo predefinido, se agrega como opción dinámica en vez
    // de descartarlo. Evita mantener tablas de sinónimos fuente→catálogo: ningún
    // dato de SENASA se pierde, sin importar cuántas variantes use.
    const opts = value && !options.includes(value) ? [value, ...options] : options;
    return h(
      UI.Select,
      { value, onValueChange: onChange, placeholder, clearable: true },
      ...opts.map((o) => h(UI.SelectItem, { key: o, value: o }, o))
    );
  }

  // Meta de cada opción del dropdown: laboratorio + especies (formateadas a los
  // labels de Pacientes). Es propio de Farmacia, por eso se inyecta al buscador
  // compartido vía `renderItemMeta` en vez de vivir adentro del componente.
  const senaItemMeta = (p: CatalogProductSummary): string =>
    (p.laboratory ?? '—') + (p.species?.length ? ` · ${compactSpecies(p.species)}` : '');

  function compRow(c: CompRow, i: number) {
    return h(
      'div',
      { className: 'comp-row', key: i },
      h(
        'div',
        { className: 'comp-pa' },
        combo(c.substance, (v) => setComp(i, 'substance', v), paOptions, 'Ej: Enrofloxacina')
      ),
      h(
        'div',
        { className: 'comp-conc compound' },
        h(UI.Input, {
          size: 'sm',
          value: c.concVal,
          placeholder: 'Conc.',
          onChange: (e: { target: { value: string } }) =>
            setComp(i, 'concVal', e.target.value.replace(/[^\d.,]/g, '')),
        }),
        h(
          'div',
          { className: 'unit' },
          select(c.concUnit, (v) => setComp(i, 'concUnit', v), CONC_UNITS, 'Unidad')
        )
      ),
      form.components.length > 1
        ? h(
            UI.Button,
            {
              variant: 'ghost',
              size: 'icon',
              title: 'Quitar componente',
              onClick: () => removeComp(i),
            },
            h(UI.DynamicIcon, { icon: 'X', size: 14 })
          )
        : null
    );
  }

  const footer = h(
    React.Fragment,
    null,
    isEdit
      ? h(
          UI.Button,
          {
            variant: 'ghost',
            disabled: saving,
            onClick: () => setConfirmDelete(true),
            className: 'text-cg-danger mr-auto',
          },
          h(UI.DynamicIcon, { icon: 'Trash2', size: 15 }),
          'Eliminar'
        )
      : null,
    h(
      UI.Button,
      {
        variant: 'outline',
        onClick: () => {
          if (isEdit) onEditClose?.();
          else setOpen(false);
        },
      },
      'Cancelar'
    ),
    h(
      UI.Button,
      { disabled: saving, onClick: () => void handleSubmit() },
      saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar medicamento'
    )
  );

  return h(
    React.Fragment,
    null,
    isEdit
      ? null
      : h(
          UI.Button,
          { onClick: () => setOpen(true) },
          h(UI.DynamicIcon, { icon: 'Plus', size: 16 }),
          'Nuevo medicamento'
        ),
    h(
      UI.FormDialog,
      {
        open: open || isEdit,
        onOpenChange: (v: boolean) => {
          if (!v) {
            if (isEdit) onEditClose?.();
            else setOpen(false);
          }
        },
        title: isEdit ? 'Editar medicamento' : 'Nuevo medicamento',
        footer,
        size: 'lg',
      },
      h(
        'div',
        { className: 'vp-meds', style: { display: 'flex', flexDirection: 'column', gap: 22 } },

        // 0 · Buscador SENASA (solo en alta; en edición no aplica)
        isEdit
          ? null
          : h(
              'div',
              { className: 'sena-bar' },
              h(CatalogSearch, {
                kind: 'medication',
                selected: senaSelected,
                onSelect: (detail: CatalogProductDetail) => void handleSelect(detail),
                onClear: () => setSenaSelected(null),
                collapsed: senaCollapsed,
                onCollapsedChange: setSenaCollapsed,
                title: 'Buscar en el vademécum de SENASA',
                subtitle:
                  'Buscá por nombre comercial o principio activo y completamos casi toda la ficha clínica.',
                placeholder: 'Buscar por nombre comercial o principio activo...',
                itemIcon: 'Pill',
                renderItemMeta: senaItemMeta,
              })
            ),

        // 1 · Identificación clínica
        h(
          'div',
          { className: 'form-section' },
          h(
            'div',
            { className: 'form-section-head' },
            h('span', { className: 'step' }, '1'),
            h('span', { className: 'form-section-eyebrow' }, 'Identificación clínica'),
            senaSelected
              ? h(
                  'span',
                  { className: 'sena-legend' },
                  h(UI.DynamicIcon, { icon: 'Check', size: 11 }),
                  'Completado desde SENASA'
                )
              : null
          ),

          // Principios activos
          h(
            'div',
            null,
            h(
              'div',
              { className: 'label-row' },
              h(
                UI.Label,
                null,
                'Principio activo ',
                h('span', { style: { color: 'var(--cg-red)' } }, '*'),
                senaTag()
              ),
              form.components.length > 1
                ? h('span', { className: 'comp-count' }, `${form.components.length} componentes`)
                : null
            ),
            h(
              'div',
              { className: 'comp-list' },
              form.components.map((c, i) => compRow(c, i))
            ),
            h(
              'p',
              { className: 'field-hint' },
              'Sumá más de uno si el producto es una combinación.'
            ),
            h(
              'button',
              { type: 'button', className: 'add-comp', onClick: addComp },
              h(UI.DynamicIcon, { icon: 'Plus', size: 13 }),
              'Agregar principio activo'
            )
          ),

          // Laboratorio + Vía
          h(
            'div',
            { className: 'grid-2' },
            h(
              'div',
              null,
              h(UI.Label, null, 'Laboratorio', senaTag()),
              h(LaboratorySelect, {
                value: form.laboratory_id,
                onValueChange: (v: string) => update('laboratory_id', v),
              })
            ),
            h(
              'div',
              null,
              h(UI.Label, null, 'Vía de administración', senaTag()),
              select(
                form.administration_route,
                (v) => update('administration_route', v),
                routeOpts,
                'Seleccionar...'
              )
            )
          ),

          // Presentación: tipo + tamaño + unidad
          h(
            'div',
            null,
            h(UI.Label, null, 'Presentación', senaTag()),
            h(
              'div',
              { className: 'pres-row' },
              h(
                'div',
                { className: 'pres-type' },
                select(form.presType, (v) => update('presType', v), presTypeOpts, 'Tipo...')
              ),
              h(
                'div',
                { className: 'pres-size' },
                h(UI.Input, {
                  size: 'sm',
                  value: form.presSize,
                  placeholder: 'Tamaño',
                  onChange: (e: { target: { value: string } }) =>
                    update('presSize', e.target.value.replace(/[^\d.,]/g, '')),
                })
              ),
              h(
                'div',
                { className: 'pres-unit' },
                select(form.presUnit, (v) => update('presUnit', v), presUnitOpts, 'Unidad')
              )
            ),
            h('p', { className: 'field-hint' }, 'El tamaño es opcional.')
          ),

          // Clasificación + Registro SENASA
          h(
            'div',
            { className: 'grid-2' },
            h(
              'div',
              null,
              h(UI.Label, null, 'Clasificación', senaTag()),
              select(
                form.classification,
                (v) => update('classification', v),
                classificationOpts,
                'Seleccionar...'
              )
            ),
            h(
              'div',
              null,
              h(UI.Label, null, 'Registro SENASA', senaTag()),
              h(UI.Input, {
                size: 'sm',
                value: form.senasa_registration,
                placeholder: 'Nro. de registro',
                onChange: (e: { target: { value: string } }) =>
                  update('senasa_registration', e.target.value),
              })
            )
          ),

          // Especies
          h(
            'div',
            null,
            h(UI.Label, null, 'Especies destino', senaTag()),
            h(
              'div',
              { className: 'chips-wrap' },
              enabledSpecies.map((s) =>
                h(
                  'button',
                  {
                    key: s.code,
                    type: 'button',
                    className: `chip-pick ${form.species.includes(s.code) ? 'on' : ''}`,
                    onClick: () => toggleSpecies(s.code),
                  },
                  h(UI.DynamicIcon, { icon: s.icon, size: 13 }),
                  s.label
                )
              )
            )
          ),

          // Indicaciones
          h(
            'div',
            null,
            h(UI.Label, null, 'Indicaciones / acción terapéutica', senaTag()),
            h(UI.Textarea, {
              value: form.indications,
              rows: 2,
              placeholder: 'Ej: Antibiótico — infecciones bacterianas sistémicas',
              onChange: (e: { target: { value: string } }) => update('indications', e.target.value),
            })
          )
        ),

        // Nombre auto-compuesto
        h(
          'div',
          null,
          h(
            'div',
            { className: 'label-row' },
            h(
              UI.Label,
              null,
              'Nombre ',
              h('span', { style: { color: 'var(--cg-red)' } }, '*'),
              senaSelected
                ? senaTag()
                : !nameDirty
                  ? h('span', { className: 'pending-tag' }, 'Automático')
                  : null
            ),
            nameDirty
              ? h(
                  'button',
                  { type: 'button', className: 'add-comp', onClick: () => setNameDirty(false) },
                  h(UI.DynamicIcon, { icon: 'Sparkles', size: 12 }),
                  'Recomponer automático'
                )
              : null
          ),
          h(UI.Input, {
            value: name,
            placeholder: 'Se arma con principio activo + concentración + presentación',
            onChange: (e: { target: { value: string } }) => {
              setName(e.target.value);
              setNameDirty(true);
            },
          })
        ),

        // 2 · Dispensación y precio
        h(
          'div',
          { className: 'form-section' },
          h(
            'div',
            { className: 'form-section-head' },
            h('span', { className: 'step' }, '2'),
            h('span', { className: 'form-section-eyebrow' }, 'Dispensación y precio'),
            senaSelected
              ? h(
                  'span',
                  { className: 'pending-tag' },
                  h(UI.DynamicIcon, { icon: 'TriangleAlert', size: 11 }),
                  'A completar por vos'
                )
              : null
          ),
          senaSelected
            ? h(
                'p',
                { className: 'pending-note' },
                h(UI.DynamicIcon, { icon: 'Info', size: 13 }),
                h(
                  'span',
                  null,
                  'SENASA no expone precio ni régimen de receta. Completalos a mano (por defecto quedan apagados).'
                )
              )
            : null,

          h(
            'div',
            { className: 'switch-row' },
            h(
              'div',
              { className: 'sw-text' },
              h('div', { className: 'sw-label' }, 'Requiere receta'),
              h('div', { className: 'sw-hint' }, 'Se exigirá emitir receta para dispensarlo.'),
              form.controlled
                ? h(
                    'span',
                    { className: 'lock-note' },
                    h(UI.DynamicIcon, { icon: 'Lock', size: 11 }),
                    'Forzado: un medicamento controlado siempre requiere receta.'
                  )
                : null
            ),
            h(UI.Switch, {
              checked: form.requires_prescription,
              disabled: form.controlled,
              onCheckedChange: (v: boolean) => update('requires_prescription', v),
            })
          ),

          h(
            'div',
            { className: `switch-row ${form.controlled ? 'locked-on' : ''}` },
            h(
              'div',
              { className: 'sw-text' },
              h('div', { className: 'sw-label' }, 'Controlado SENASA'),
              h('div', { className: 'sw-hint' }, 'Requiere receta archivada y validez.')
            ),
            h(UI.Switch, {
              checked: form.controlled,
              onCheckedChange: (v: boolean) => setControlado(v),
            })
          ),

          h(
            'div',
            { className: 'grid-2' },
            h(
              'div',
              null,
              h(UI.Label, null, 'Precio de venta'),
              h(UI.Input, {
                size: 'sm',
                value: form.sale_price,
                inputMode: 'numeric',
                placeholder: '0',
                onChange: (e: { target: { value: string } }) =>
                  update('sale_price', e.target.value.replace(/[^\d]/g, '')),
              })
            ),
            h('div', null)
          )
        )
      ),
      // Confirmación de borrado (solo en edición). Va ANIDADA como hijo del
      // FormDialog —no como Dialog hermano— a propósito: aunque Radix portalee su
      // contenido al body, lo que importa para el stack de capas es la posición en
      // el árbol React. Como Dialog hermano, el DismissableLayer del FormDialog
      // interpretaba el click dentro del confirm como "click afuera" y disparaba su
      // onInteractOutside → cerraba AMBOS diálogos (y antes, con z-index forzado, el
      // confirm ni se veía). Anidado, Radix lo trata como capa hija: el confirm se
      // monta encima y el padre no se cierra al interactuar con él.
      isEdit
        ? h(
            UI.Dialog,
            { open: confirmDelete, onOpenChange: setConfirmDelete },
            h(
              UI.DialogContent,
              {
                size: 'sm',
                onClose: () => setConfirmDelete(false),
              },
              h(UI.DialogHeader, null, h(UI.DialogTitle, null, 'Eliminar medicamento')),
              h(
                UI.DialogBody,
                null,
                h(
                  'div',
                  { className: 'text-sm text-cg-text' },
                  `¿Eliminar "${name.trim() || editMedication?.active_ingredient || ''}"? Se borrarán también sus componentes. No se puede deshacer.`
                )
              ),
              h(
                UI.DialogFooter,
                null,
                h(
                  UI.Button,
                  {
                    type: 'button',
                    variant: 'outline',
                    disabled: saving,
                    onClick: () => setConfirmDelete(false),
                  },
                  'Cancelar'
                ),
                h(
                  UI.Button,
                  {
                    type: 'button',
                    variant: 'destructive',
                    disabled: saving,
                    onClick: () => void handleDelete(),
                  },
                  saving ? 'Eliminando...' : 'Eliminar'
                )
              )
            )
          )
        : null
    )
  );
}
