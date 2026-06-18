import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Prescription, PrescriptionFilters } from '../types/domain.js';

const React = getHostReact();
const { useState, useEffect, useRef, useCallback } = React;

interface PaginatedResult {
  data: Prescription[];
  total: number;
}

/** Lista de recetas con filtros y paginación */
export function usePrescriptions(initialFilters?: PrescriptionFilters) {
  const [data, setData] = useState<Prescription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PrescriptionFilters>(initialFilters ?? {});
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<PaginatedResult>('vet-pharmacy.prescriptions.search', {
        query: filters.search,
        filters: {
          status: filters.status,
          from: filters.from,
          to: filters.to,
        },
        limit: pageSize,
        offset: page * pageSize,
      });
      if (!mountedRef.current) return;
      setData(result?.data ?? []);
      setTotal(result?.total ?? 0);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error loading prescriptions');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters, page, pageSize]);

  const setFilters = useCallback((newFilters: Partial<PrescriptionFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPage(0);
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

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    page,
    totalPages,
    setPage,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchData,
  };
}
