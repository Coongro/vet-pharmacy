import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { PrescriptionWithItems, Prescription, PrescriptionItem } from '../types/domain.js';

const React = getHostReact();
const { useState, useEffect, useRef, useCallback } = React;

/** Detalle de una receta con sus items */
export function usePrescription(prescriptionId: string | null | undefined) {
  const [prescription, setPrescription] = useState<PrescriptionWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!prescriptionId) {
      setPrescription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rx, items] = await Promise.all([
        actions.execute<Prescription | undefined>('vet-pharmacy.prescriptions.getById', {
          id: prescriptionId,
        }),
        actions.execute<PrescriptionItem[]>('vet-pharmacy.prescription-items.listByPrescription', {
          prescriptionId,
        }),
      ]);
      if (!mountedRef.current) return;
      if (rx) {
        setPrescription({ ...rx, items: items ?? [] });
      } else {
        setPrescription(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error loading prescription');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { prescription, loading, error, refetch: fetch };
}
