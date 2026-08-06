import { useState, useCallback } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { Dashboard, DashboardWidget, WidgetType, WidgetConfig, WidgetLayout } from '../types/dashboard.types';
import { WIDGET_BY_TYPE } from '../constants/widget-registry';

export function useDashboardState() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // ─── Load Dashboards ────────────────────────────────────────────────────────
  const loadDashboards = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardService.fetchAll();
      setDashboards(list);
      // Set the first default or first dashboard as active
      const def = list.find(d => d.isDefault) || list[0];
      if (def && !activeDashboard) {
        const full = await dashboardService.fetchOne(def.id);
        setActiveDashboard(full);
      }
    } catch (err) {
      console.error('Failed to load dashboards', err);
    } finally {
      setLoading(false);
    }
  }, [activeDashboard]);

  const selectDashboard = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const full = await dashboardService.fetchOne(id);
      setActiveDashboard(full);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Dashboard CRUD ─────────────────────────────────────────────────────────
  const createDashboard = useCallback(async (data: { name: string; description?: string; color?: string; icon?: string }) => {
    const newDash = await dashboardService.create(data);
    setDashboards(prev => [newDash, ...prev]);
    setActiveDashboard(newDash);
    return newDash;
  }, []);

  const renameDashboard = useCallback(async (id: string, name: string) => {
    await dashboardService.update(id, { name } as any);
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, name } : d));
    if (activeDashboard?.id === id) {
      setActiveDashboard(prev => prev ? { ...prev, name } : prev);
    }
  }, [activeDashboard]);

  const deleteDashboard = useCallback(async (id: string) => {
    await dashboardService.delete(id);
    setDashboards(prev => prev.filter(d => d.id !== id));
    if (activeDashboard?.id === id) {
      const remaining = dashboards.filter(d => d.id !== id);
      if (remaining.length > 0) {
        const next = await dashboardService.fetchOne(remaining[0].id);
        setActiveDashboard(next);
      } else {
        setActiveDashboard(null);
      }
    }
  }, [activeDashboard, dashboards]);

  const cloneDashboard = useCallback(async (id: string, name?: string) => {
    const cloned = await dashboardService.clone(id, name);
    if (cloned) {
      setDashboards(prev => [cloned as Dashboard, ...prev]);
    }
  }, []);

  const toggleStar = useCallback(async (id: string) => {
    const result = await dashboardService.toggleStar(id);
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, isStarred: result.isStarred } : d));
  }, []);

  // ─── Widget Management ──────────────────────────────────────────────────────
  const addWidget = useCallback(async (type: WidgetType) => {
    if (!activeDashboard) return;
    const entry = WIDGET_BY_TYPE.get(type);
    if (!entry) return;

    // Find next available y position
    const maxY = activeDashboard.widgets.reduce((max, w) => {
      return Math.max(max, w.layout.y + w.layout.h);
    }, 0);

    const layout: WidgetLayout = { ...entry.defaultLayout, x: 0, y: maxY };
    const newWidget = await dashboardService.addWidget(activeDashboard.id, {
      type,
      title: entry.label,
      config: entry.defaultConfig,
      layout,
    });

    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: [...prev.widgets, newWidget],
    } : prev);
  }, [activeDashboard]);

  const removeWidget = useCallback(async (widgetId: string) => {
    if (!activeDashboard) return;
    await dashboardService.deleteWidget(activeDashboard.id, widgetId);
    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
    } : prev);
  }, [activeDashboard]);

  const updateWidgetConfig = useCallback(async (widgetId: string, config: Partial<WidgetConfig>) => {
    if (!activeDashboard) return;
    const widget = activeDashboard.widgets.find(w => w.id === widgetId);
    if (!widget) return;
    const updated = await dashboardService.updateWidget(activeDashboard.id, widgetId, {
      config: { ...widget.config, ...config },
    });
    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? updated : w),
    } : prev);
  }, [activeDashboard]);

  const renameWidget = useCallback(async (widgetId: string, title: string) => {
    if (!activeDashboard) return;
    await dashboardService.updateWidget(activeDashboard.id, widgetId, { title } as any);
    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? { ...w, title } : w),
    } : prev);
  }, [activeDashboard]);

  const toggleWidgetLock = useCallback(async (widgetId: string) => {
    if (!activeDashboard) return;
    const widget = activeDashboard.widgets.find(w => w.id === widgetId);
    if (!widget) return;
    const updated = await dashboardService.updateWidget(activeDashboard.id, widgetId, { isLocked: !widget.isLocked } as any);
    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? updated : w),
    } : prev);
  }, [activeDashboard]);

  const toggleWidgetHide = useCallback(async (widgetId: string) => {
    if (!activeDashboard) return;
    const widget = activeDashboard.widgets.find(w => w.id === widgetId);
    if (!widget) return;
    const updated = await dashboardService.updateWidget(activeDashboard.id, widgetId, { isHidden: !widget.isHidden } as any);
    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? updated : w),
    } : prev);
  }, [activeDashboard]);

  const duplicateWidget = useCallback(async (widgetId: string) => {
    if (!activeDashboard) return;
    const newWidget = await dashboardService.duplicateWidget(activeDashboard.id, widgetId);
    setActiveDashboard(prev => prev ? {
      ...prev,
      widgets: [...prev.widgets, newWidget],
    } : prev);
  }, [activeDashboard]);

  // ─── Layout Persistence ─────────────────────────────────────────────────────
  const saveLayouts = useCallback(async (newLayouts: Array<{ id: string; layout: WidgetLayout }>) => {
    if (!activeDashboard) return;
    // Optimistic update
    setActiveDashboard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map(w => {
          const found = newLayouts.find(l => l.id === w.id);
          return found ? { ...w, layout: found.layout } : w;
        }),
      };
    });
    // Persist to backend (debounce-like — fire and forget)
    try {
      await dashboardService.updateLayouts(activeDashboard.id, newLayouts);
    } catch (err) {
      console.error('Failed to save layout', err);
    }
  }, [activeDashboard]);

  return {
    dashboards,
    activeDashboard,
    loading,
    isEditMode,
    setIsEditMode,
    loadDashboards,
    selectDashboard,
    createDashboard,
    renameDashboard,
    deleteDashboard,
    cloneDashboard,
    toggleStar,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    renameWidget,
    toggleWidgetLock,
    toggleWidgetHide,
    duplicateWidget,
    saveLayouts,
  };
}
