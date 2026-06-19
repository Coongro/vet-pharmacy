import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Batch } from '../types/domain.js';

const React = getHostReact();
const { useState, useEffect, useRef, useCallback } = React;

/** Lotes de un producto, ordenados por vencimiento ASC (FIFO) */
export function useBatches(productId: string | null | undefined) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!productId) {
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<Batch[]>('products.batches.listByProduct', {
        productId,
      });
      if (!mountedRef.current) return;
      setBatches(result ?? []);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error loading batches');
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

  return { batches, loading, error, refetch: fetch };
}
