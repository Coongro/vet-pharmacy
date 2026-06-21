/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, actions } from '@coongro/plugin-sdk';
import { useLaboratories } from '@coongro/vademecum';

import { CreateMedicationButton } from '../../components/CreateMedicationButton.js';
import { ExpirationBadge } from '../../components/ExpirationBadge.js';
import { MigrationBanner } from '../../components/MigrationBanner.js';
import { useDetectTextMedications } from '../../hooks/useDetectTextMedications.js';
import { useMedications } from '../../hooks/useMedications.js';
import { SPECIES_LABEL, SPECIES_ICON } from '../../species.js';
import type { Medication } from '../../types/domain.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useEffect, useCallback } = React;
const h = React.createElement;

// Dedup + orden alfabético (es), filtrando vacíos. Para derivar los catálogos
// vivos (valores ya usados en el tenant) que se pasan al alta.
function uniqSorted(vals: Array<string | null | undefined>): string[] {
  return Array.from(new Set(vals.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export function MedicamentosView() {
  const { data, loading, filters: _filters, setFilters, refetch } = useMedications();
  const detection = useDetectTextMedications();
  // Nombre del laboratorio resuelto del maestro compartido (vademecum) por id,
  // con fallback al texto denormalizado para datos aún sin migrar (COONG-219).
  const { laboratories } = useLaboratories();
  const labNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const lab of laboratories) map.set(lab.id, lab.name);
    return map;
  }, [laboratories]);

  // Enriquecimiento: precio (del producto) + stock y vencimiento (de los lotes activos), para
  // que la Farmacia muestre de un vistazo lo que un vet necesita: qué tiene y qué se vence.
  const [ext, setExt] = useState<
    Record<string, { price: string | null; stock: number; expiry: string | null }>
  >({});
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [products, batches] = await Promise.all([
          actions
            .execute<Array<{ id: string; sale_price: string | null }>>('products.items.list')
            .catch(() => [] as Array<{ id: string; sale_price: string | null }>),
          actions
            .execute<
              Array<{
                product_id: string;
                quantity: string;
                expiration_date: string;
                status: string;
              }>
            >('products.batches.list')
            .catch(
              () =>
                [] as Array<{
                  product_id: string;
                  quantity: string;
                  expiration_date: string;
                  status: string;
                }>
            ),
        ]);
        const map: Record<string, { price: string | null; stock: number; expiry: string | null }> =
          {};
        for (const p of products ?? []) map[p.id] = { price: p.sale_price, stock: 0, expiry: null };
        for (const b of batches ?? []) {
          if (b.status !== 'active') continue;
          const e = map[b.product_id] ?? { price: null, stock: 0, expiry: null };
          e.stock += Number(b.quantity) || 0;
          if (!e.expiry || b.expiration_date < e.expiry) e.expiry = b.expiration_date;
          map[b.product_id] = e;
        }
        if (active) setExt(map);
      } catch {
        /* products / batches no disponibles */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Al crear medicamentos desde el banner, refrescar la lista principal
  const handleCreateAll = useCallback(
    async (names: string[]) => {
      const count = await detection.createAll(names);
      await refetch();
      return count;
    },
    [detection, refetch]
  );

  // Estado de controles de filtro (locales, con debounce para texto)
  const [searchInput, setSearchInput] = useState('');
  const [prescriptionFilter, setPrescriptionFilter] = useState<'' | 'true' | 'false'>('');
  const [controlledFilter, setControlledFilter] = useState<'' | 'true' | 'false'>('');

  const debouncedSearch = UI.useDebounce(searchInput, 300);

  // Sincronizar filtros locales con el hook (un solo effect, sin disparar en mount)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setFilters({
      search: debouncedSearch || undefined,
      requires_prescription: prescriptionFilter === '' ? undefined : prescriptionFilter === 'true',
      controlled: controlledFilter === '' ? undefined : controlledFilter === 'true',
    });
  }, [debouncedSearch, prescriptionFilter, controlledFilter]);

  // Edición: la fila clickeada abre el modal con ese medicamento (antes intentaba
  // abrir products.detail.open, que no existe en este setup → 404).
  const [editTarget, setEditTarget] = useState<Medication | null>(null);

  // Columnas del DataTable (patrón estándar de Coongro, como Cobros/Salidas):
  // cada celda se arma con clases tailwind y UI.Badge, sin CSS custom.
  const columns = React.useMemo(
    () => [
      {
        key: 'medicamento',
        header: 'Medicamento',
        render: (m: Medication) =>
          h(
            'div',
            null,
            h('div', { className: 'font-medium text-cg-text' }, m.active_ingredient),
            m.concentration
              ? h('div', { className: 'text-xs text-cg-text-muted mt-0.5' }, m.concentration)
              : null
          ),
      },
      {
        key: 'lab',
        header: 'Laboratorio / Vía',
        render: (m: Medication) =>
          h(
            'div',
            { className: 'flex flex-col gap-1 items-start' },
            h(
              'span',
              { className: 'text-sm' },
              labNameById.get(m.laboratory_id ?? '') || m.laboratory || '—'
            ),
            m.administration_route
              ? h(UI.Badge, { variant: 'secondary' } as any, m.administration_route)
              : null
          ),
      },
      {
        key: 'especies',
        header: 'Especies',
        render: (m: Medication) => {
          const list = m.species ?? [];
          if (list.length === 0) return h('span', { className: 'text-cg-text-muted' }, '—');
          return h(
            'div',
            { className: 'flex flex-wrap gap-1' },
            ...list.map((code) =>
              h(
                UI.Badge,
                { key: code, variant: 'secondary' } as any,
                h(UI.DynamicIcon, { icon: SPECIES_ICON[code] ?? 'PawPrint', size: 11 } as any),
                h('span', { className: 'ml-1' }, SPECIES_LABEL[code] ?? code)
              )
            )
          );
        },
      },
      {
        key: 'indicadores',
        header: 'Indicadores',
        render: (m: Medication) =>
          h(
            'div',
            { className: 'flex flex-col gap-1 items-start' },
            h(
              UI.Badge,
              { variant: m.requires_prescription ? 'orange' : 'secondary' } as any,
              m.requires_prescription ? 'Receta · Sí' : 'Receta · No'
            ),
            h(
              UI.Badge,
              { variant: m.controlled ? 'danger-soft' : 'secondary' } as any,
              m.controlled ? 'Controlado' : 'No controlado'
            )
          ),
      },
      {
        key: 'stock',
        header: 'Stock',
        render: (m: Medication) => {
          const e = ext[m.product_id];
          const stock = e?.stock ?? 0;
          return stock > 0
            ? h('span', { className: 'font-mono font-semibold' }, `${stock} u.`)
            : h(UI.Badge, { variant: 'danger-soft' } as any, 'Sin stock');
        },
      },
      {
        key: 'vence',
        header: 'Vence',
        render: (m: Medication) => {
          const e = ext[m.product_id];
          return e?.expiry
            ? h(ExpirationBadge, { expirationDate: e.expiry })
            : h('span', { className: 'text-cg-text-muted' }, '—');
        },
      },
      {
        key: 'precio',
        header: 'Precio',
        className: 'text-right',
        render: (m: Medication) => {
          const e = ext[m.product_id];
          const has = e?.price !== null && e?.price !== undefined && e?.price !== '';
          return h(
            'span',
            { className: 'font-mono font-semibold' },
            has ? `$ ${Number(e.price).toLocaleString('es-AR')}` : '—'
          );
        },
      },
    ],
    [ext, labNameById]
  );

  // Catálogo vivo: valores ya usados en el tenant para cada selector. Mismas
  // opciones para alta y edición, derivadas una sola vez (evita recomputar en
  // cada render y desincronizar las dos llamadas a CreateMedicationButton).
  const catalogOptions = React.useMemo(
    () => ({
      paOptions: uniqSorted(data.map((m) => m.active_ingredient)),
      extraRoutes: uniqSorted(data.map((m) => m.administration_route)),
      extraClassifications: uniqSorted(
        data.map((m) => (m.metadata as { classification?: string } | null)?.classification)
      ),
      extraPresTypes: uniqSorted(
        data.map((m) => (m.metadata as { presentationType?: string } | null)?.presentationType)
      ),
      extraPresUnits: uniqSorted(
        data.map((m) => (m.metadata as { presentationUnit?: string } | null)?.presentationUnit)
      ),
    }),
    [data]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return h(
    'div',
    { className: 'vp-meds p-6 min-h-full bg-[var(--cg-bg)] text-[var(--cg-text)]' },

    // Header
    h(
      'div',
      { className: 'flex items-center justify-between mb-4 gap-4' },
      h('h1', { className: 'text-xl font-semibold text-[var(--cg-text)] m-0' }, 'Medicamentos'),
      h(
        'div',
        { className: 'flex items-center gap-2' },
        h(CreateMedicationButton, {
          onSuccess: () => void refetch(),
          ...catalogOptions,
        })
      )
    ),

    // Banner de migración (solo si hay medicamentos de texto detectados)
    !detection.loading && !detection.dismissed && detection.detected.length > 0
      ? h(MigrationBanner, {
          detected: detection.detected,
          creating: detection.creating,
          onCreateAll: handleCreateAll,
          onDismiss: detection.dismiss,
        })
      : null,

    // Lista — UI.DataTable (patrón estándar de Coongro, como Cobros/Salidas)
    h(
      'div',
      { className: 'bg-cg-bg rounded-xl border border-cg-border p-6 shadow-sm' },
      h(UI.DataTable, {
        data,
        columns,
        rowKey: (m: Medication) => m.id,
        loading,
        onRowClick: (m: Medication) => setEditTarget(m),
        searchValue: searchInput,
        onSearchChange: setSearchInput,
        searchPlaceholder: 'Principio activo o laboratorio',
        filterSections: [
          {
            label: 'Receta',
            options: [
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Sí' },
              { value: 'false', label: 'No' },
            ],
            value: prescriptionFilter,
            onChange: (v: string) => setPrescriptionFilter(v as '' | 'true' | 'false'),
          },
          {
            label: 'Controlado',
            options: [
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Sí' },
              { value: 'false', label: 'No' },
            ],
            value: controlledFilter,
            onChange: (v: string) => setControlledFilter(v as '' | 'true' | 'false'),
          },
        ],
        emptyState: {
          title: 'No hay medicamentos',
          description: 'Cargá tu primer medicamento desde el vademécum de SENASA o manualmente.',
        },
        skeletonRows: 8,
      } as any)
    ),

    // Modal de edición — se abre con el medicamento de la fila clickeada.
    editTarget
      ? h(CreateMedicationButton, {
          editMedication: editTarget,
          onEditClose: () => setEditTarget(null),
          onSuccess: () => {
            void refetch();
            setEditTarget(null);
          },
          ...catalogOptions,
        })
      : null
  );
}
