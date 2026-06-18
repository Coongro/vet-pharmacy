/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

import type { Medication } from '../../types/domain.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

interface ConsultationMed {
  id: string;
  name: string;
  dosage_amount?: string | null;
  dosage_unit?: string | null;
  route?: string | null;
  frequency_hours?: number | null;
  duration_amount?: number | null;
  duration_unit?: string | null;
  notes?: string | null;
}

interface MedLink {
  consultation_medication_id: string;
  medication_id: string | null;
  product_id: string | null;
}

interface EnrichedMed {
  consultationMed: ConsultationMed;
  link: MedLink | null;
  medication: Medication | null;
}

// --- Subcomponentes ---

/** Línea compacta de dosis: "15 mg/kg · Oral · c/8h · 7 días" */
function DosageLine(props: {
  dosage_amount?: string | null;
  dosage_unit?: string | null;
  route?: string | null;
  frequency_hours?: number | null;
  duration_amount?: number | null;
  duration_unit?: string | null;
}) {
  const parts: string[] = [];
  if (props.dosage_amount) parts.push(`${props.dosage_amount} ${props.dosage_unit ?? ''}`);
  if (props.route) parts.push(props.route);
  if (props.frequency_hours) parts.push(`c/${props.frequency_hours}h`);
  if (props.duration_amount)
    parts.push(`${props.duration_amount} ${props.duration_unit ?? 'días'}`);
  if (parts.length === 0) return null;

  return h('span', { className: 'text-[13px] text-cg-text-muted' }, parts.join('  ·  '));
}

/** Info farmacéutica inline: "Holliday · Comprimidos" */
function PharmacyInfoLine(props: { medication: Medication }) {
  const { medication: med } = props;
  const parts: string[] = [];
  if (med.laboratory) parts.push(med.laboratory);
  if (med.presentation) parts.push(med.presentation);
  if (parts.length === 0) return null;

  return h('span', { className: 'text-xs text-cg-text-muted' }, parts.join(' · '));
}

/** Badges de advertencia: Receta, Controlado */
function WarningBadges(props: { medication: Medication }) {
  const { medication: med } = props;
  const badges: ReturnType<typeof h>[] = [];

  if (med.requires_prescription) {
    badges.push(h(UI.Badge, { key: 'rx', variant: 'danger-soft', size: 'sm' }, '\u26a0 Receta'));
  }

  if (med.controlled) {
    badges.push(
      h(UI.Badge, { key: 'ctrl', variant: 'destructive', size: 'sm' }, '\ud83d\udd12 Controlado')
    );
  }

  if (badges.length === 0) return null;
  return h('div', { className: 'flex gap-1.5 flex-wrap' }, ...badges);
}

/** Card individual de medicamento */
function MedCard(props: { item: EnrichedMed; onNavigate: (productId: string) => void }) {
  const { consultationMed: cm, medication, link } = props.item;
  const hasLink = !!link && !!medication;
  const isClickable = hasLink && !!link.product_id;

  const cardContent = h(
    'div',
    { className: 'flex flex-col gap-1' },
    // Fila 1: nombre + icono
    h(
      'div',
      { className: 'flex items-center justify-between gap-2' },
      h('span', { className: 'text-sm font-medium text-cg-text' }, cm.name),
      isClickable
        ? h(
            'span',
            { className: 'text-cg-accent shrink-0 opacity-70' },
            h(UI.DynamicIcon, { icon: 'ExternalLink', size: 14 })
          )
        : null
    ),
    // Fila 2: info farmacéutica (solo si vinculado)
    hasLink ? h(PharmacyInfoLine, { medication }) : null,
    // Fila 3: dosis compacta
    h(DosageLine, {
      dosage_amount: cm.dosage_amount,
      dosage_unit: cm.dosage_unit,
      route: cm.route,
      frequency_hours: cm.frequency_hours,
      duration_amount: cm.duration_amount,
      duration_unit: cm.duration_unit,
    }),
    // Fila 4: notas
    cm.notes
      ? h('span', { className: 'text-xs text-cg-text-muted italic' }, `"${cm.notes}"`)
      : null,
    // Fila 5: badges de advertencia
    hasLink ? h(WarningBadges, { medication }) : null
  );

  const borderClass = hasLink
    ? 'border-l-[3px] border-l-cg-accent'
    : 'border-l-[3px] border-l-cg-border';

  if (isClickable) {
    return h(
      'button',
      {
        key: cm.id,
        type: 'button',
        onClick: () => {
          if (link.product_id) props.onNavigate(link.product_id);
        },
        className: `w-full text-left ${borderClass}`,
      },
      h(
        UI.Card,
        { className: `border-l-0 transition-colors hover:bg-cg-bg-secondary` },
        h(UI.CardBody, null, cardContent)
      )
    );
  }

  return h(
    'div',
    { key: cm.id, className: `${borderClass}` },
    h(UI.Card, { className: 'border-l-0' }, h(UI.CardBody, null, cardContent))
  );
}

// --- Componente principal ---

/**
 * Contribución a consultations.detail.open — muestra medicamentos enriquecidos.
 * Card clickable con borde accent si está vinculado a farmacia.
 */
export function ConsultationMedicationDetail(props: Record<string, unknown>) {
  const { views } = usePlugin();
  const medications = (props.medications ?? []) as ConsultationMed[];
  const [enriched, setEnriched] = useState<EnrichedMed[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (medications.length === 0) {
        if (mountedRef.current) {
          setEnriched([]);
          setLoading(false);
        }
        return;
      }

      try {
        const medIds = medications.map((m) => m.id).filter(Boolean);
        let links: MedLink[] = [];
        try {
          links =
            (await actions.execute<MedLink[]>(
              'vet-pharmacy.consultation-med-links.listByConsultationMedIds',
              { ids: medIds }
            )) ?? [];
        } catch {
          // Tabla no existe todavía o error — seguir sin links
        }

        const linkMap = new Map<string, MedLink>();
        for (const l of links) {
          linkMap.set(l.consultation_medication_id, l);
        }

        const medicationIds = links.map((l) => l.medication_id).filter((id): id is string => !!id);
        const medDataMap = new Map<string, Medication>();

        if (medicationIds.length > 0) {
          await Promise.all(
            medicationIds.map(async (medId) => {
              try {
                const med = await actions.execute<Medication>('vet-pharmacy.medications.getById', {
                  id: medId,
                });
                if (med) medDataMap.set(medId, med);
              } catch {
                // Silencioso
              }
            })
          );
        }

        if (!mountedRef.current) return;

        setEnriched(
          medications.map((cm) => {
            const link = linkMap.get(cm.id) ?? null;
            const medication = link?.medication_id
              ? (medDataMap.get(link.medication_id) ?? null)
              : null;
            return { consultationMed: cm, link, medication };
          })
        );
      } catch {
        if (!mountedRef.current) return;
        setEnriched(
          medications.map((cm) => ({ consultationMed: cm, link: null, medication: null }))
        );
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    void load();
  }, [medications]);

  const navigateToProduct = useCallback(
    (productId: string) => {
      views.open('products.detail.open', { productId });
    },
    [views]
  );

  if (loading) {
    return h(
      'div',
      { className: 'flex flex-col gap-2' },
      h(UI.Skeleton, { className: 'h-16 w-full rounded-lg' }),
      h(UI.Skeleton, { className: 'h-16 w-full rounded-lg' })
    );
  }

  if (enriched.length === 0) {
    return h('p', { className: 'text-xs text-cg-text-muted italic' }, 'Sin medicación prescrita');
  }

  return h(
    'div',
    { className: 'flex flex-col gap-2' },
    ...enriched.map((item) =>
      h(MedCard, { key: item.consultationMed.id, item, onNavigate: navigateToProduct })
    )
  );
}
