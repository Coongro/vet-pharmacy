/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, actions, events, usePlugin } from '@coongro/plugin-sdk';

import { AutocompleteInput } from '../../components/AutocompleteInput.js';
import { chargeConsultationMedications } from '../../data/billing.js';
import type { Batch, Medication } from '../../types/domain.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useEffect, useCallback, useRef } = React;
const h = React.createElement;

/** Mapa nombre→medicamento para resolver links cuando se crea la consulta */
interface PendingLink {
  name: string;
  medicationId: string;
  productId: string;
}

/** dd/mm/aaaa a partir de un ISO; tolera vacío. */
function fmtExp(iso: string): string {
  const d = (iso ?? '').slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : '';
}

/**
 * Contribution a consultations.form.open — selector de medicamentos.
 * Usa AutocompleteInput en modo selector (showToggle + minChars:0).
 *
 * Lote (COONG-213): igual que las vacunas, cada medicamento recetado puede elegir
 * el LOTE del que sale (lotes genéricos de products.batches, FIFO por vencimiento —
 * COONG-217). Al guardar la consulta, el lote elegido se DESCUENTA (products.batches.update),
 * igual que la vacuna descuenta su variante. Sin lote cargado, el medicamento se receta como antes.
 *
 * Escucha consultations.medications.create para persistir el link medicamento↔producto.
 */
export function ConsultationMedicationSection(props: Record<string, unknown>) {
  // Callback del host (ConsultationForm) para comunicar medicamentos seleccionados
  const onMedicationsChange = props.onMedicationsChange as
    | ((
        meds: {
          name: string;
          dosage?: string | null;
          frequency?: string | null;
          duration?: string | null;
        }[]
      ) => void)
    | undefined;

  const { toast } = usePlugin();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Medication[]>([]);
  const pendingLinksRef = useRef<PendingLink[]>([]);
  const selectedRef = useRef<Medication[]>([]);
  // Cantidad por medicamento (para el cobro: receto 2 frascos → cobra 2).
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  const qtyByIdRef = useRef<Record<string, string>>({});
  // Lotes (batches) por producto + lote elegido por medicamento.
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, Batch[]>>({});
  const batchesByProductRef = useRef<Record<string, Batch[]>>({});
  const [loteByMedId, setLoteByMedId] = useState<Record<string, string>>({});
  const loteByMedIdRef = useRef<Record<string, string>>({});

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    qtyByIdRef.current = qtyById;
  }, [qtyById]);
  useEffect(() => {
    batchesByProductRef.current = batchesByProduct;
  }, [batchesByProduct]);
  useEffect(() => {
    loteByMedIdRef.current = loteByMedId;
  }, [loteByMedId]);

  const searchMedications = useCallback(async (query: string): Promise<Medication[]> => {
    try {
      const meds = await actions.execute<Medication[]>('vet-pharmacy.medications.search', {
        query,
      });
      return meds ?? [];
    } catch {
      return [];
    }
  }, []);

  /** Carga (una vez por producto) los lotes con stock disponible, FIFO por vencimiento. */
  const loadBatches = useCallback(async (productId: string) => {
    if (batchesByProductRef.current[productId]) return;
    try {
      const result = await actions.execute<Batch[]>('products.batches.listByProduct', {
        productId,
      });
      const withStock = (result ?? []).filter((b) => (Number(b.quantity) || 0) > 0);
      setBatchesByProduct((prev) => ({ ...prev, [productId]: withStock }));
    } catch {
      setBatchesByProduct((prev) => ({ ...prev, [productId]: [] }));
    }
  }, []);

  const handleSelect = useCallback(
    (med: Medication) => {
      // Dup-safe: chequeo + update funcional (un doble-click no agrega dos veces).
      if (selectedRef.current.some((s) => s.id === med.id)) {
        toast.warning('Ya agregado', 'Este medicamento ya está en la lista');
        return;
      }
      setSelected((prev) => (prev.some((s) => s.id === med.id) ? prev : [...prev, med]));
      setQtyById((prev) => (prev[med.id] ? prev : { ...prev, [med.id]: '1' }));
      setSearch('');
      void loadBatches(med.product_id);
    },
    [toast, loadBatches]
  );

  const setQty = useCallback((medId: string, value: string) => {
    setQtyById((prev) => ({ ...prev, [medId]: value }));
  }, []);

  const setLote = useCallback((medId: string, batchId: string) => {
    setLoteByMedId((prev) => ({ ...prev, [medId]: batchId }));
  }, []);

  const removeMedication = useCallback((medId: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== medId));
    setQtyById((prev) => {
      const next = { ...prev };
      delete next[medId];
      return next;
    });
    setLoteByMedId((prev) => {
      const next = { ...prev };
      delete next[medId];
      return next;
    });
  }, []);

  // Sincronizar medicamentos seleccionados con el host (ConsultationForm)
  // y mantener pendingLinks actualizado para el event listener
  useEffect(() => {
    if (!onMedicationsChange) return;

    // Actualizar mapa de links pendientes
    pendingLinksRef.current = selected.map((med) => ({
      name: med.active_ingredient + (med.concentration ? ` ${med.concentration}` : ''),
      medicationId: med.id,
      productId: med.product_id,
    }));

    onMedicationsChange(
      selected.map((med) => ({
        name: med.active_ingredient + (med.concentration ? ` ${med.concentration}` : ''),
        dosage: med.concentration ?? null,
        frequency: null,
        duration: null,
      }))
    );
  }, [selected, onMedicationsChange]);

  // Escuchar cuando consultations crea un medicamento de consulta.
  // Matchear por nombre y persistir el link en tabla propia de vet-pharmacy.
  useEffect(() => {
    return events.on(
      'consultations.medications.create',
      (payload: { actionId: string; args: unknown; result: unknown }) => {
        const args = payload.args as { data?: { name?: string } } | undefined;
        const result = payload.result as Array<{ id: string }> | undefined;

        const createdName = args?.data?.name?.trim();
        const createdId = result?.[0]?.id;
        if (!createdName || !createdId) return;

        // Buscar en pendingLinks por nombre exacto
        const match = pendingLinksRef.current.find(
          (pl) => pl.name.toLowerCase() === createdName.toLowerCase()
        );
        if (!match) return;

        // Persistir link en tabla propia de vet-pharmacy (fire-and-forget)
        void actions
          .execute('vet-pharmacy.consultation-med-links.create', {
            data: {
              consultation_medication_id: createdId,
              medication_id: match.medicationId,
              product_id: match.productId,
            },
          })
          .catch(() => {
            // Silencioso — si falla no rompe nada, queda como texto libre
          });
      }
    );
  }, []);

  // Punto B: al GUARDAR la consulta, cobrar los medicamentos seleccionados como línea en la
  // cuenta de la visita (mismo ticket que servicios/vacunas) y DESCONTAR el lote elegido
  // (igual que vaccination descuenta su variante). Mismo patrón que vaccination.
  useEffect(() => {
    return events.on(
      'consultations.records.create',
      (payload: { actionId: string; args: unknown; result: unknown }) => {
        const meds = selectedRef.current;
        if (meds.length === 0) return;
        const row = (payload.result as Array<Record<string, unknown>> | undefined)?.[0];
        const petId = row?.pet_id as string | undefined;
        if (!petId) return;
        const consultationId = (row?.id as string | undefined) ?? null;
        void (async () => {
          let contactId: string | null = null;
          try {
            const pets =
              await actions.execute<Array<{ id: string; owner_id: string }>>('patients.pets.list');
            contactId = pets?.find((p) => p.id === petId)?.owner_id ?? null;
          } catch {
            /* sin pets: cobramos sin contacto */
          }
          await chargeConsultationMedications({
            petId,
            consultationId,
            contactId,
            meds: meds.map((m) => ({
              productId: m.product_id,
              name: m.active_ingredient + (m.concentration ? ` ${m.concentration}` : ''),
              medicationId: m.id,
              quantity: qtyByIdRef.current[m.id] || '1',
            })),
          });

          // Descontar el lote elegido por cada medicamento (parida con vacunas).
          for (const m of meds) {
            const batchId = loteByMedIdRef.current[m.id];
            if (!batchId) continue;
            const batch = (batchesByProductRef.current[m.product_id] ?? []).find(
              (b) => b.id === batchId
            );
            if (!batch) continue;
            const dispensed = Number(qtyByIdRef.current[m.id] || '1') || 1;
            const next = Math.max(0, (Number(batch.quantity) || 0) - dispensed);
            try {
              await actions.execute('products.batches.update', {
                id: batchId,
                data: { quantity: String(next) },
              });
            } catch {
              /* el descuento de stock es best-effort; el cobro ya quedó registrado */
            }
          }
          setSelected([]);
        })();
      }
    );
  }, []);

  return h(
    'div',
    { className: 'flex flex-col gap-3' },

    // Selector con autocomplete
    /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
    h(
      AutocompleteInput as any,
      {
        onSearch: searchMedications,
        renderOption: (med: Medication) =>
          h(
            'div',
            null,
            h('div', { className: 'font-medium' }, med.active_ingredient),
            h(
              'div',
              { className: 'text-xs text-cg-text-muted' },
              [med.concentration, med.laboratory].filter(Boolean).join(' — ')
            )
          ),
        onSelect: handleSelect,
        value: search,
        onChange: setSearch,
        placeholder: 'Buscar medicamento...',
        minChars: 0,
        showToggle: true,
      } as any
    ),
    /* eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

    // Medicamentos seleccionados (chips)
    selected.length > 0
      ? h(
          'div',
          { className: 'flex flex-col gap-2' },
          ...selected.map((med) => {
            const batches = batchesByProduct[med.product_id] ?? [];
            return h(
              'div',
              { key: med.id, className: 'flex items-center gap-2' },
              h(
                'span',
                { className: 'flex-1 text-[13px] text-cg-text min-w-0 truncate' },
                med.active_ingredient + (med.concentration ? ` ${med.concentration}` : '')
              ),
              // Selector de lote (si el medicamento tiene lotes con stock).
              batches.length > 0 &&
                h(
                  'div',
                  { className: 'w-44' },
                  h(
                    UI.Select,
                    {
                      value: loteByMedId[med.id] ?? '',
                      onValueChange: (v: string) => setLote(med.id, v),
                      placeholder: 'Lote…',
                      size: 'sm',
                      'aria-label': 'Lote',
                    } as any,
                    ...batches.map((b) =>
                      h(
                        UI.SelectItem,
                        { key: b.id, value: b.id } as any,
                        `${b.batch_number} · vence ${fmtExp(b.expiration_date)}`
                      )
                    )
                  )
                ),
              h(
                'div',
                { className: 'w-20' },
                h(UI.Input, {
                  type: 'number',
                  size: 'sm',
                  min: 1,
                  value: qtyById[med.id] ?? '1',
                  onChange: (e: { target: { value: string } }) => setQty(med.id, e.target.value),
                  'aria-label': 'Cantidad',
                })
              ),
              h(
                UI.IconButton,
                {
                  variant: 'ghost',
                  size: 'sm',
                  'aria-label': `Quitar ${med.active_ingredient}`,
                  onClick: () => removeMedication(med.id),
                },
                h(UI.DynamicIcon, { icon: 'X', size: 14 })
              )
            );
          })
        )
      : h(
          'p',
          { className: 'text-[13px] text-cg-text-muted italic' },
          'Seleccionar medicamentos para esta consulta'
        )
  );
}
