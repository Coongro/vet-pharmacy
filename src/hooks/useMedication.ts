import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Medication } from '../types/domain.js';

const React = getHostReact();
const { useState, useEffect, useRef, useCallback } = React;

/**
 * Datos farmacéuticos de un producto específico.
 * Si no existe registro, `medication` es null.
 */
export function useMedication(productId: string | null | undefined) {
  const [medication, setMedication] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!productId) {
      setMedication(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<Medication | undefined>(
        'vet-pharmacy.medications.getByProductId',
        { productId }
      );
      if (!mountedRef.current) return;
      setMedication(result ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error loading medication');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { medication, loading, error, refetch: fetch };
}
