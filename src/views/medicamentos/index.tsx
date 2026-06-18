/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

import { CreateMedicationButton } from '../../components/CreateMedicationButton.js';
import { ExpirationBadge } from '../../components/ExpirationBadge.js';
import { MigrationBanner } from '../../components/MigrationBanner.js';
import { useDetectTextMedications } from '../../hooks/useDetectTextMedications.js';
import { useMedications } from '../../hooks/useMedications.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useEffect, useCallback } = React;
const h = React.createElement;

// ─── Componente badge Sí/No ───────────────────────────────────────────────────

function BoolBadge({ value }: { value: boolean }) {
  return h(UI.Badge, { variant: value ? 'success-soft' : 'secondary' }, value ? 'Sí' : 'No');
}

// ─── Filas skeleton para estado de carga ──────────────────────────────────────

function SkeletonRows() {
  const cols = 9;
  return h(
    React.Fragment,
    null,
    ...[0, 1, 2, 3, 4].map((i) =>
      h(
        UI.TableRow,
        { key: i },
        ...[...Array(cols)].map((_, ci) =>
          h(
            UI.TableCell,
            { key: ci },
            h(UI.Skeleton, {
              className: `h-4 inline-block`,
              style: { width: `${55 + Math.sin(i * cols + ci) * 30}%` },
            })
          )
        )
      )
    )
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export function MedicamentosView() {
  const { views } = usePlugin();

  const { data, loading, filters: _filters, setFilters, refetch } = useMedications();
  const detection = useDetectTextMedications();

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
            >('vet-pharmacy.batches.list')
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
  const [laboratoryInput, setLaboratoryInput] = useState('');
  const [prescriptionFilter, setPrescriptionFilter] = useState<'' | 'true' | 'false'>('');
  const [controlledFilter, setControlledFilter] = useState<'' | 'true' | 'false'>('');

  const debouncedSearch = UI.useDebounce(searchInput, 300);
  const debouncedLaboratory = UI.useDebounce(laboratoryInput, 300);

  // Sincronizar filtros locales con el hook (un solo effect, sin disparar en mount)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setFilters({
      search: debouncedSearch || undefined,
      laboratory: debouncedLaboratory || undefined,
      requires_prescription: prescriptionFilter === '' ? undefined : prescriptionFilter === 'true',
      controlled: controlledFilter === '' ? undefined : controlledFilter === 'true',
    });
  }, [debouncedSearch, debouncedLaboratory, prescriptionFilter, controlledFilter]);

  const handleRowClick = useCallback(
    (productId: string) => {
      views.open('products.detail.open', { productId });
    },
    [views]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return h(
    'div',
    { className: 'p-6 min-h-full bg-[var(--cg-bg)] text-[var(--cg-text)]' },

    // Header
    h(
      'div',
      { className: 'flex items-center justify-between mb-4 gap-4' },
      h('h1', { className: 'text-xl font-semibold text-[var(--cg-text)] m-0' }, 'Medicamentos'),
      h(
        'div',
        { className: 'flex items-center gap-2' },
        h(UI.Input, {
          type: 'text',
          size: 'sm',
          placeholder: 'Buscar por principio activo...',
          value: searchInput,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value),
          'aria-label': 'Buscar medicamentos',
          className: 'w-[240px]',
        }),
        h(CreateMedicationButton, { onSuccess: () => void refetch() })
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

    // Barra de filtros
    h(
      'div',
      { className: 'flex gap-3 items-center mb-4 flex-wrap' },

      // Filtro: Requiere receta
      h(
        'div',
        { className: 'flex items-center gap-1.5' },
        h(
          UI.Label,
          { className: 'text-[13px] text-[var(--cg-text-muted)] whitespace-nowrap' },
          'Requiere receta:'
        ),
        h(
          UI.Select,
          {
            value: prescriptionFilter,
            onValueChange: (val: string) => setPrescriptionFilter(val as '' | 'true' | 'false'),
            placeholder: 'Todos',
            clearable: true,
            'aria-label': 'Filtrar por receta requerida',
          },
          h(UI.SelectItem, { value: '' }, 'Todos'),
          h(UI.SelectItem, { value: 'true' }, 'Sí'),
          h(UI.SelectItem, { value: 'false' }, 'No')
        )
      ),

      // Filtro: Controlado
      h(
        'div',
        { className: 'flex items-center gap-1.5' },
        h(
          UI.Label,
          { className: 'text-[13px] text-[var(--cg-text-muted)] whitespace-nowrap' },
          'Controlado:'
        ),
        h(
          UI.Select,
          {
            value: controlledFilter,
            onValueChange: (val: string) => setControlledFilter(val as '' | 'true' | 'false'),
            placeholder: 'Todos',
            clearable: true,
            'aria-label': 'Filtrar por controlado',
          },
          h(UI.SelectItem, { value: '' }, 'Todos'),
          h(UI.SelectItem, { value: 'true' }, 'Sí'),
          h(UI.SelectItem, { value: 'false' }, 'No')
        )
      ),

      // Filtro: Laboratorio
      h(
        'div',
        { className: 'flex items-center gap-1.5' },
        h(
          UI.Label,
          { className: 'text-[13px] text-[var(--cg-text-muted)] whitespace-nowrap' },
          'Laboratorio:'
        ),
        h(UI.Input, {
          type: 'text',
          size: 'sm',
          placeholder: 'Filtrar por laboratorio',
          value: laboratoryInput,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setLaboratoryInput(e.target.value),
          'aria-label': 'Filtrar por laboratorio',
          className: 'min-w-[160px]',
        })
      )
    ),

    // Tabla
    h(
      UI.Table,
      null,

      // Encabezado
      h(
        UI.TableHeader,
        null,
        h(
          UI.TableRow,
          null,
          h(UI.TableHead, null, 'Principio activo'),
          h(UI.TableHead, null, 'Concentración'),
          h(UI.TableHead, null, 'Laboratorio'),
          h(UI.TableHead, null, 'Vía'),
          h(UI.TableHead, null, 'Receta'),
          h(UI.TableHead, null, 'Controlado'),
          h(UI.TableHead, null, 'Precio'),
          h(UI.TableHead, null, 'Stock'),
          h(UI.TableHead, null, 'Vence')
        )
      ),

      // Cuerpo
      h(
        UI.TableBody,
        null,

        loading
          ? h(SkeletonRows, null)
          : data.length === 0
            ? h(
                UI.TableRow,
                null,
                h(
                  UI.TableCell,
                  { colSpan: 9 },
                  h(UI.EmptyState, { title: 'No se encontraron medicamentos' })
                )
              )
            : data.map((med) => {
                const e = ext[med.product_id] ?? { price: null, stock: 0, expiry: null };
                return h(
                  UI.TableRow,
                  {
                    key: med.id,
                    className: 'cursor-pointer hover:bg-[var(--cg-bg-hover)] transition-colors',
                    onClick: () => handleRowClick(med.product_id),
                  },
                  h(UI.TableCell, null, med.active_ingredient),
                  h(UI.TableCell, null, med.concentration ?? '—'),
                  h(UI.TableCell, null, med.laboratory ?? '—'),
                  h(UI.TableCell, null, med.administration_route ?? '—'),
                  h(UI.TableCell, null, h(BoolBadge, { value: med.requires_prescription })),
                  h(UI.TableCell, null, h(BoolBadge, { value: med.controlled })),
                  h(
                    UI.TableCell,
                    null,
                    e.price !== null && e.price !== undefined && e.price !== ''
                      ? `$ ${Number(e.price).toLocaleString('es-AR')}`
                      : '—'
                  ),
                  h(
                    UI.TableCell,
                    null,
                    e.stock > 0
                      ? String(e.stock)
                      : h('span', { className: 'text-[var(--cg-text-muted)]' }, 'Sin stock')
                  ),
                  h(
                    UI.TableCell,
                    null,
                    e.expiry ? h(ExpirationBadge, { expirationDate: e.expiry }) : '—'
                  )
                );
              })
      )
    )
  );
}
