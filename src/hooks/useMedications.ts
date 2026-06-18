import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Medication, MedicationFilters } from '../types/domain.js';

const React = getHostReact();
const { useState, useEffect, useRef, useCallback } = React;

/** Lista de medicamentos con filtros opcionales */
export function useMedications(initialFilters?: MedicationFilters) {
  const [data, setData] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<MedicationFilters>(initialFilters ?? {});
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<Medication[]>('vet-pharmacy.medications.search', {
        query: filters.search,
        filters: {
          laboratory: filters.laboratory,
          requires_prescription: filters.requires_prescription,
          controlled: filters.controlled,
        },
      });
      if (!mountedRef.current) return;
      setData(result ?? []);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error loading medications');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<MedicationFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading, error, filters, setFilters, refetch: fetchData };
}
