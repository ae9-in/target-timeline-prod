import { useState, useCallback } from 'react';
import type { GlobalFilter } from '../types/dashboard.types';

const INITIAL_FILTER: GlobalFilter = {};

export function useGlobalFilter() {
  const [filter, setFilter] = useState<GlobalFilter>(INITIAL_FILTER);

  const updateFilter = useCallback((updates: Partial<GlobalFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilter(INITIAL_FILTER);
  }, []);

  const clearField = useCallback((field: keyof GlobalFilter) => {
    setFilter(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const hasActiveFilters = Object.values(filter).some(v => v !== undefined && v !== '');

  // Apply global filter to a targets array
  const applyFilter = useCallback((targets: any[]) => {
    return targets.filter(t => {
      if (filter.department && t.vertical !== filter.department) return false;
      if (filter.location && t.locationId !== filter.location) return false;
      if (filter.owner && t.owner !== filter.owner) return false;
      if (filter.ragStatus && t.ragStatus !== filter.ragStatus) return false;
      if (filter.dateFrom && new Date(t.deadline) < new Date(filter.dateFrom)) return false;
      if (filter.dateTo && new Date(t.deadline) > new Date(filter.dateTo)) return false;
      return true;
    });
  }, [filter]);

  return {
    filter,
    updateFilter,
    resetFilter,
    clearField,
    hasActiveFilters,
    applyFilter,
  };
}
