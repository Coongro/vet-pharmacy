import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Medication } from '../types/domain.js';

const React = getHostReact();
const { useState, useEffect, useRef, useCallback } = React;

/** Medicamento detectado por texto en consultas */
export interface DetectedMedication {
  name: string;
  count: number;
}

interface DetectionResult {
  detected: DetectedMedication[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  /** Crea productos + registros de medicamento para los nombres seleccionados */
  createAll: (names: string[]) => Promise<number>;
  /** Descartar el banner (no persistente, solo sesión) */
  dismiss: () => void;
  dismissed: boolean;
}

interface ConsultationMedication {
  id: string;
  name: string;
}

/**
 * Detecta medicamentos escritos como texto libre en consultas
 * que aún no tienen un registro en vet-pharmacy.
 *
 * Compara los nombres únicos de consultations.medications
 * contra los active_ingredient de vet-pharmacy.medications.
 */
export function useDetectTextMedications(): DetectionResult {
  const [detected, setDetected] = useState<DetectedMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Escanear al montar
  useEffect(() => {
    const scan = async () => {
      setLoading(true);
      setError(null);
      try {
        // Obtener medicamentos de texto de consultas (puede fallar si consultations no está instalado)
        let textMeds: ConsultationMedication[] = [];
        try {
          textMeds =
            (await actions.execute<ConsultationMedication[]>('consultations.medications.list')) ??
            [];
        } catch {
          // consultations no instalado o sin datos — no mostrar banner
          if (mountedRef.current) setLoading(false);
          return;
        }

        const existingMeds = await actions.execute<Medication[]>('vet-pharmacy.medications.list');
        if (!mountedRef.current) return;

        // Obtener links existentes (medicamentos ya vinculados a productos)
        let linkedIds = new Set<string>();
        try {
          const allIds = (textMeds ?? []).map((m) => m.id).filter(Boolean);
          if (allIds.length > 0) {
            const links = await actions.execute<Array<{ consultation_medication_id: string }>>(
              'vet-pharmacy.consultation-med-links.listByConsultationMedIds',
              { ids: allIds }
            );
            linkedIds = new Set((links ?? []).map((l) => l.consultation_medication_id));
          }
        } catch {
          // Si falla, no excluir nada — peor caso muestra el banner
        }
        if (!mountedRef.current) return;

        // Nombres existentes (normalizados a lowercase para comparar)
        const existingNames = new Set(
          (existingMeds ?? []).map((m) => m.active_ingredient.toLowerCase().trim())
        );

        // Contar ocurrencias de cada nombre único de texto
        const nameCountMap = new Map<string, number>();
        for (const tm of textMeds ?? []) {
          const normalized = tm.name.trim();
          if (!normalized) continue;
          // Saltar si ya existe como medicamento registrado
          if (existingNames.has(normalized.toLowerCase())) continue;
          // Saltar si ya tiene un link a un producto de vet-pharmacy
          if (linkedIds.has(tm.id)) continue;
          nameCountMap.set(normalized, (nameCountMap.get(normalized) ?? 0) + 1);
        }

        // Convertir a array ordenado por cantidad descendente
        const result: DetectedMedication[] = Array.from(nameCountMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setDetected(result);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Error escaneando medicamentos');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    void scan();
  }, []);

  // Crear productos + registros de medicamento para los nombres seleccionados
  const createAll = useCallback(async (names: string[]): Promise<number> => {
    setCreating(true);
    let created = 0;
    try {
      for (const name of names) {
        // 1. Crear producto (retorna array de rows)
        const rows = await actions.execute<Array<{ id: string }>>('products.items.create', {
          data: {
            name,
            description: 'Medicamento importado automáticamente — completar datos',
          },
        });
        const productId = rows?.[0]?.id;
        if (!productId) continue;

        // 2. Crear registro de medicamento vinculado al producto
        await actions.execute('vet-pharmacy.medications.create', {
          data: {
            product_id: productId,
            active_ingredient: name,
            requires_prescription: false,
            controlled: false,
          },
        });
        created++;
      }
      // Remover los creados de la lista de detectados
      if (mountedRef.current) {
        const createdSet = new Set(names.map((n) => n.toLowerCase()));
        setDetected((prev) => prev.filter((d) => !createdSet.has(d.name.toLowerCase())));
      }
      return created;
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { detected, loading, error, creating, createAll, dismiss, dismissed };
}
