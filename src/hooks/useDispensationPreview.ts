/**
 * Hook reutilizable para obtener el preview de dispensación FIFO.
 *
 * Llama al comando backend getDispensationPreview y retorna
 * los items con sus lotes disponibles. Puede usarse en cualquier
 * componente que necesite mostrar de qué lotes se descontará.
 */
import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { DispensationPreview } from '../types/domain.js';

const React = getHostReact();
const { useState, useCallback, useEffect, useRef } = React;

interface UseDispensationPreviewResult {
  preview: DispensationPreview | null;
  loading: boolean;
  error: string | null;
  fetch: (prescriptionId: string) => Promise<void>;
  clear: () => void;
}

export function useDispensationPreview(
  prescriptionId?: string | null
): UseDispensationPreviewResult {
  const [preview, setPreview] = useState<DispensationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<DispensationPreview>(
        'vet-pharmacy.getDispensationPreview',
        { prescriptionId: id }
      );
      if (!mountedRef.current) return;
      setPreview(result ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error obteniendo preview');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  // Auto-fetch si se pasa prescriptionId
  useEffect(() => {
    if (prescriptionId) {
      void fetch(prescriptionId);
    } else {
      clear();
    }
  }, [prescriptionId, fetch, clear]);

  return { preview, loading, error, fetch, clear };
}
