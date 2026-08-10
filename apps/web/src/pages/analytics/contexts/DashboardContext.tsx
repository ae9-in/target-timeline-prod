import React, { createContext, useContext, useEffect } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import { useDashboardData, type RefreshInterval } from '../hooks/useDashboardData';
import { useGlobalFilter } from '../hooks/useGlobalFilter';
import type { AnalyticsData, Dashboard, GlobalFilter, WidgetConfig, WidgetType, WidgetLayout } from '../types/dashboard.types';

interface DashboardContextType {
  // Dashboard State
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  loading: boolean;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  loadDashboards: () => Promise<void>;
  selectDashboard: (id: string) => Promise<void>;
  createDashboard: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<Dashboard>;
  renameDashboard: (id: string, name: string) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  cloneDashboard: (id: string, name?: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;

  // Widget Management
  addWidget: (type: WidgetType) => Promise<void>;
  removeWidget: (widgetId: string) => Promise<void>;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => Promise<void>;
  renameWidget: (widgetId: string, title: string) => Promise<void>;
  toggleWidgetLock: (widgetId: string) => Promise<void>;
  toggleWidgetHide: (widgetId: string) => Promise<void>;
  duplicateWidget: (widgetId: string) => Promise<void>;
  saveLayouts: (layouts: Array<{ id: string; layout: WidgetLayout }>) => Promise<void>;

  // Analytics Data
  analyticsData: AnalyticsData;
  refreshData: () => Promise<void>;
  lastRefreshed: Date | null;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (v: RefreshInterval) => void;

  // Global Filter
  filter: GlobalFilter;
  updateFilter: (updates: Partial<GlobalFilter>) => void;
  resetFilter: () => void;
  hasActiveFilters: boolean;
  applyFilter: (targets: any[]) => any[];
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dashState = useDashboardState();
  const [refreshInterval, setRefreshInterval] = React.useState<RefreshInterval>('5m');
  const { data: analyticsData, refresh: refreshData, lastRefreshed } = useDashboardData(refreshInterval);
  const filterState = useGlobalFilter();

  // Load dashboards on mount
  useEffect(() => {
    dashState.loadDashboards();
  }, []);

  const value: DashboardContextType = {
    ...dashState,
    analyticsData,
    refreshData,
    lastRefreshed,
    refreshInterval,
    setRefreshInterval,
    ...filterState,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextType => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
};
