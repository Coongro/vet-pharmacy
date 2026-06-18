/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Vista de Recetas — layout split view (B4).
 *
 * Izquierda: lista con filtros, paginación, tabs de estado.
 * Derecha: detalle + flujo de dispensación guiado con preview FIFO.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import { getHostReact, getHostUI, settings } from '@coongro/plugin-sdk';

import { DispensationConfirm } from '../../components/DispensationConfirm.js';
import {
  PrescriptionDetailPanel,
  printPrescription,
} from '../../components/PrescriptionDetailPanel.js';
import { PrescriptionListItem } from '../../components/PrescriptionListItem.js';
import { PrescriptionModal } from '../../components/PrescriptionModal.js';
import { PrescriptionListSkeleton } from '../../components/skeletons/PrescriptionListSkeleton.js';
import { usePrescription } from '../../hooks/usePrescription.js';
import { usePrescriptionMutations } from '../../hooks/usePrescriptionMutations.js';
import { usePrescriptions } from '../../hooks/usePrescriptions.js';
import type { PrescriptionStatus } from '../../types/domain.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useCallback, useEffect } = React;
const h = React.createElement;

// ─── Constantes ─────────────────────────────────────────────────────────────

interface StatusTab {
  value: string;
  label: string;
}

const STATUS_TABS: StatusTab[] = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'partially_dispensed', label: 'Parciales' },
  { value: 'dispensed', label: 'Dispensadas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'cancelled', label: 'Anuladas' },
];

// ─── Vista principal ────────────────────────────────────────────────────────

export function RecetasView() {
  // ─── Estado ─────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDispenseConfirm, setShowDispenseConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [transitionReason, setTransitionReason] = useState('');
  // Modo simple: si las recetas formales están desactivadas (setting), no mostramos el circuito.
  const [rxEnabled, setRxEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const v = await settings.get<boolean>('vet-pharmacy.usePrescriptions');
        if (active) setRxEnabled(v ?? false);
      } catch {
        if (active) setRxEnabled(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Responsive: detectar si es pantalla chica (< 1024px)
  const [isCompact, setIsCompact] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setShowDispenseConfirm(false);
  }, []);

  const debouncedSearch = UI.useDebounce(searchInput, 300);
  const mutations = usePrescriptionMutations();

  const { data, total, page, totalPages, setPage, loading, setFilters, refetch } = usePrescriptions(
    {
      search: debouncedSearch || undefined,
      status: (statusFilter as PrescriptionStatus) || undefined,
    }
  );

  // Detalle de la receta seleccionada (para el footer de acciones)
  const { prescription: selectedPrescription, refetch: refetchDetail } =
    usePrescription(selectedId);

  // Sincronizar filtros
  useEffect(() => {
    setFilters({
      search: debouncedSearch || undefined,
      status: (statusFilter as PrescriptionStatus) || undefined,
    });
  }, [debouncedSearch, statusFilter, setFilters]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSelectPrescription = useCallback((id: string) => {
    setSelectedId(id);
    setShowDispenseConfirm(false);
  }, []);

  const handleCreate = useCallback(() => {
    setShowCreate(true);
  }, []);

  const handleCreated = useCallback(
    (id: string) => {
      setShowCreate(false);
      setSelectedId(id);
      void refetch();
    },
    [refetch]
  );

  const handleDispenseClick = useCallback(() => {
    setShowDispenseConfirm(true);
  }, []);

  const handleDispenseConfirm = useCallback(async () => {
    if (!selectedId) return;
    const ok = await mutations.dispense(selectedId);
    if (ok) {
      setShowDispenseConfirm(false);
      void refetch();
    }
  }, [selectedId, mutations, refetch]);

  const handleDispenseCancel = useCallback(() => {
    setShowDispenseConfirm(false);
  }, []);

  const handleStatusChanged = useCallback(() => {
    void refetch();
  }, [refetch]);

  // ─── Render ─────────────────────────────────────────────────────────────

  // Modo simple: recetas formales desactivadas → no mostramos el circuito hospitalario.
  if (rxEnabled === null) {
    return h('div', { style: { height: 'calc(100vh - 60px)' } });
  }
  if (rxEnabled === false) {
    return h(
      'div',
      {
        className: 'flex items-center justify-center bg-cg-bg-secondary text-cg-text',
        style: { height: 'calc(100vh - 60px)' },
      },
      h(UI.EmptyState, {
        title: 'Modo simple activo',
        description:
          'Las recetas formales están desactivadas. Registrás los medicamentos directo en la consulta (se cobran solos) o por venta de mostrador. Si necesitás recetas formales, activalas en Configuración → Farmacia Veterinaria.',
        icon: h(UI.DynamicIcon, { icon: 'FileText', size: 32 }),
      })
    );
  }

  return h(
    'div',
    {
      className: 'flex min-w-0 bg-cg-bg-secondary text-cg-text',
      style: { height: 'calc(100vh - 60px)', overflow: 'hidden' },
    },

    // ═══ PANEL IZQUIERDO — Lista ═══════════════════════════════════════════
    // En modo compacto: ocultar si hay receta seleccionada
    (!isCompact || !selectedId) &&
      h(
        'div',
        {
          className: isCompact
            ? 'flex flex-col flex-1 min-w-0 overflow-hidden bg-cg-bg'
            : 'flex flex-col w-[430px] min-w-[320px] border-r border-cg-border flex-shrink-0 bg-cg-bg',
        },

        // Header
        h(
          'div',
          { className: 'flex items-center justify-between px-3 py-2.5 border-b border-cg-border' },
          h(
            'span',
            {
              className: 'text-cg-text',
              style: { fontFamily: "'Noto Serif JP', serif", fontWeight: 900, fontSize: '18px' },
            },
            'Recetas'
          ),
          h(
            UI.Button,
            { size: 'sm', onClick: handleCreate },
            h(UI.DynamicIcon, { icon: 'Plus', size: 14 }),
            ' Nueva'
          )
        ),

        // Búsqueda
        h(
          'div',
          { className: 'px-3 py-2' },
          h(UI.Input, {
            size: 'sm',
            type: 'text',
            placeholder: 'Buscar mascota, dueño, vet...',
            value: searchInput,
            onChange: (e: { target: { value: string } }) => setSearchInput(e.target.value),
          })
        ),

        // Tabs de estado (underline variant — #351)
        h(
          'div',
          { className: 'px-3 pb-2' },
          h(
            UI.Tabs,
            {
              value: statusFilter,
              onValueChange: (val: string) => setStatusFilter(val),
            },
            h(
              'div',
              { className: 'overflow-x-auto', style: { scrollbarWidth: 'none' } },
              h(
                UI.TabsList,
                { variant: 'underline', className: 'w-max' },
                ...STATUS_TABS.map((tab) =>
                  h(UI.TabsTrigger, { key: tab.value, value: tab.value }, tab.label)
                )
              )
            )
          )
        ),

        // Lista
        h(
          UI.ScrollArea,
          { orientation: 'vertical', className: 'flex-1 min-h-0' },
          h(
            'div',
            { className: 'flex flex-col gap-1 px-2 py-1' },
            loading
              ? h(PrescriptionListSkeleton, null)
              : data.length === 0
                ? h(
                    'div',
                    { className: 'py-8' },
                    h(UI.EmptyState, {
                      title: 'Sin recetas',
                      description: 'No se encontraron recetas con estos filtros',
                    })
                  )
                : data.map((rx) =>
                    h(PrescriptionListItem, {
                      key: rx.id,
                      prescription: rx,
                      selected: selectedId === rx.id,
                      onClick: () => handleSelectPrescription(rx.id),
                    })
                  )
          )
        ),

        // Paginación
        totalPages > 1
          ? h(
              'div',
              {
                className:
                  'flex items-center justify-between px-3 py-2 border-t border-cg-border text-xs text-cg-text-muted',
              },
              h('span', null, `${total} recetas`),
              h(
                UI.Pagination,
                null,
                h(
                  UI.PaginationContent,
                  null,
                  h(
                    UI.PaginationItem,
                    null,
                    h(UI.PaginationPrevious, {
                      onClick: () => setPage(page - 1),
                      disabled: page === 0,
                    })
                  ),
                  ...Array.from({ length: totalPages }, (_, i) =>
                    h(
                      UI.PaginationItem,
                      { key: i },
                      h(
                        UI.PaginationLink,
                        {
                          isActive: page === i,
                          onClick: () => setPage(i),
                        },
                        `${i + 1}`
                      )
                    )
                  ),
                  h(
                    UI.PaginationItem,
                    null,
                    h(UI.PaginationNext, {
                      onClick: () => setPage(page + 1),
                      disabled: page >= totalPages - 1,
                    })
                  )
                )
              )
            )
          : null
      ),

    // ═══ PANEL DERECHO — Detalle + Dispensación ════════════════════════════
    // En modo compacto: mostrar solo si hay receta seleccionada
    (!isCompact || selectedId) &&
      h(
        'div',
        { className: 'flex-1 flex flex-col min-h-0 min-w-0 p-2' },

        // Botón volver (solo en modo compacto)
        isCompact && selectedId
          ? h(
              'div',
              { className: 'pb-2' },
              h(
                UI.Button,
                {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: handleBack,
                },
                h(UI.DynamicIcon, { icon: 'ArrowLeft', size: 14 }),
                ' Volver a la lista'
              )
            )
          : null,

        // Card contenedora
        h(
          UI.Card,
          { className: 'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden' },

          !selectedId
            ? h(
                'div',
                { className: 'flex-1 flex items-center justify-center' },
                h(UI.EmptyState, {
                  title: 'Seleccioná una receta',
                  description: 'Elegí una receta de la lista para ver su detalle',
                  icon: h(UI.DynamicIcon, { icon: 'FileText', size: 32 }),
                })
              )
            : h(
                React.Fragment,
                null,
                // Detalle (scrollable)
                h(
                  'div',
                  { className: 'flex-1 overflow-y-auto min-w-0' },
                  h(PrescriptionDetailPanel, {
                    selectedId,
                    mutations,
                    onStatusChanged: handleStatusChanged,
                    hideDefaultActions: true,
                  })
                ),
                // Footer fijo: confirmación de dispensación O acciones normales
                showDispenseConfirm && selectedId
                  ? h(
                      'div',
                      { className: 'flex-shrink-0' },
                      h(DispensationConfirm, {
                        prescriptionId: selectedId,
                        onConfirm: () => void handleDispenseConfirm(),
                        onCancel: handleDispenseCancel,
                        confirming: mutations.dispensing,
                      })
                    )
                  : selectedPrescription
                    ? h(
                        UI.CardFooter,
                        { className: 'justify-start gap-2 flex-shrink-0' },
                        // Dispensar (solo active y partially_dispensed)
                        selectedPrescription.status === 'active' ||
                          selectedPrescription.status === 'partially_dispensed'
                          ? h(
                              UI.Button,
                              {
                                variant: 'brand',
                                size: 'sm',
                                disabled: mutations.dispensing,
                                onClick: handleDispenseClick,
                              },
                              selectedPrescription.status === 'partially_dispensed'
                                ? 'Completar dispensación'
                                : 'Dispensar'
                            )
                          : null,
                        // Imprimir (siempre)
                        h(
                          UI.Button,
                          {
                            variant: 'outline',
                            size: 'sm',
                            onClick: () => {
                              if (selectedPrescription) printPrescription(selectedPrescription);
                            },
                          },
                          h(UI.DynamicIcon, { icon: 'Printer', size: 14 }),
                          ' Imprimir'
                        ),
                        // Anular (active y partially_dispensed, con modal)
                        selectedPrescription.status === 'active' ||
                          selectedPrescription.status === 'partially_dispensed'
                          ? h(
                              UI.Button,
                              {
                                variant: 'outline',
                                size: 'sm',
                                className: 'text-cg-danger border-cg-danger hover:bg-cg-danger-bg',
                                disabled: mutations.transitioning,
                                onClick: () => {
                                  setTransitionReason('');
                                  setShowCancelModal(true);
                                },
                              },
                              'Anular receta'
                            )
                          : null,
                        // Reactivar (solo cancelled, con modal)
                        selectedPrescription.status === 'cancelled'
                          ? h(
                              UI.Button,
                              {
                                variant: 'outline',
                                size: 'sm',
                                disabled: mutations.transitioning,
                                onClick: () => {
                                  setTransitionReason('');
                                  setShowReactivateModal(true);
                                },
                              },
                              h(UI.DynamicIcon, { icon: 'RotateCcw', size: 14 }),
                              ' Reactivar'
                            )
                          : null
                      )
                    : null
              )
        )
      ),

    // ═══ MODAL — Crear ════════════════════════════════════════════════════
    showCreate
      ? h(PrescriptionModal, {
          mode: 'create',
          onClose: () => setShowCreate(false),
          onCreated: handleCreated,
          mutations,
        })
      : null,

    // ═══ MODAL — Anular receta (con motivo) ═══════════════════════════════
    showCancelModal && selectedId
      ? h(
          UI.FormDialog,
          {
            open: true,
            onOpenChange: (open: boolean) => {
              if (!open) setShowCancelModal(false);
            },
            title: 'Anular receta',
            size: 'sm',
            footer: h(
              React.Fragment,
              null,
              h(
                UI.Button,
                {
                  variant: 'outline',
                  size: 'sm',
                  onClick: () => setShowCancelModal(false),
                },
                'Cancelar'
              ),
              h(
                UI.Button,
                {
                  variant: 'destructive',
                  size: 'sm',
                  disabled: !transitionReason.trim() || mutations.transitioning,
                  onClick: async () => {
                    const ok = await mutations.cancel(selectedId, transitionReason);
                    if (ok) {
                      setShowCancelModal(false);
                      void refetch();
                      void refetchDetail();
                    }
                  },
                },
                mutations.transitioning ? 'Anulando...' : 'Confirmar anulación'
              )
            ),
          },
          h(
            'div',
            { className: 'flex flex-col gap-3' },
            h(
              'p',
              { className: 'text-sm text-cg-text-muted m-0' },
              '¿Estás seguro de que querés anular esta receta? Esta acción se puede revertir.'
            ),
            h(
              'div',
              { className: 'flex flex-col gap-1' },
              h(UI.Label, null, 'Motivo de anulación *'),
              h(UI.Textarea, {
                value: transitionReason,
                onChange: (e: { target: { value: string } }) => setTransitionReason(e.target.value),
                placeholder: 'Ingresá el motivo por el cual se anula la receta...',
                rows: 3,
              })
            )
          )
        )
      : null,

    // ═══ MODAL — Reactivar receta (con motivo) ═══════════════════════════
    showReactivateModal && selectedId
      ? h(
          UI.FormDialog,
          {
            open: true,
            onOpenChange: (open: boolean) => {
              if (!open) setShowReactivateModal(false);
            },
            title: 'Reactivar receta',
            size: 'sm',
            footer: h(
              React.Fragment,
              null,
              h(
                UI.Button,
                {
                  variant: 'outline',
                  size: 'sm',
                  onClick: () => setShowReactivateModal(false),
                },
                'Cancelar'
              ),
              h(
                UI.Button,
                {
                  size: 'sm',
                  disabled: !transitionReason.trim() || mutations.transitioning,
                  onClick: async () => {
                    const ok = await mutations.reactivate(selectedId, transitionReason);
                    if (ok) {
                      setShowReactivateModal(false);
                      void refetch();
                      void refetchDetail();
                    }
                  },
                },
                mutations.transitioning ? 'Reactivando...' : 'Confirmar reactivación'
              )
            ),
          },
          h(
            'div',
            { className: 'flex flex-col gap-3' },
            h(
              'p',
              { className: 'text-sm text-cg-text-muted m-0' },
              'La receta volverá al estado activa y podrá ser dispensada nuevamente.'
            ),
            h(
              'div',
              { className: 'flex flex-col gap-1' },
              h(UI.Label, null, 'Motivo de reactivación *'),
              h(UI.Textarea, {
                value: transitionReason,
                onChange: (e: { target: { value: string } }) => setTransitionReason(e.target.value),
                placeholder: 'Ingresá el motivo por el cual se reactiva la receta...',
                rows: 3,
              })
            )
          )
        )
      : null
  );
}
