import { api } from '../../../context/AuthContext';
import type { Dashboard, DashboardWidget, WidgetType, WidgetConfig, WidgetLayout } from '../types/dashboard.types';

export const dashboardService = {
  // ─── Dashboard CRUD ──────────────────────────────────────────────────────────
  fetchAll: async (): Promise<Dashboard[]> => {
    const res = await api.get('/dashboards');
    return res.data;
  },

  fetchOne: async (id: string): Promise<Dashboard> => {
    const res = await api.get(`/dashboards/${id}`);
    return res.data;
  },

  create: async (data: { name: string; description?: string; icon?: string; color?: string; isDefault?: boolean }): Promise<Dashboard> => {
    const res = await api.post('/dashboards', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Dashboard>): Promise<Dashboard> => {
    const res = await api.patch(`/dashboards/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/dashboards/${id}`);
  },

  clone: async (id: string, name?: string): Promise<Dashboard> => {
    const res = await api.post(`/dashboards/${id}/clone`, { name });
    return res.data;
  },

  toggleStar: async (id: string): Promise<{ isStarred: boolean }> => {
    const res = await api.post(`/dashboards/${id}/star`);
    return res.data;
  },

  // ─── Widget CRUD ─────────────────────────────────────────────────────────────
  addWidget: async (dashboardId: string, data: {
    type: WidgetType;
    title: string;
    config: WidgetConfig;
    layout: WidgetLayout;
  }): Promise<DashboardWidget> => {
    const res = await api.post(`/dashboards/${dashboardId}/widgets`, data);
    return res.data;
  },

  updateWidget: async (dashboardId: string, widgetId: string, data: Partial<DashboardWidget>): Promise<DashboardWidget> => {
    const res = await api.patch(`/dashboards/${dashboardId}/widgets/${widgetId}`, data);
    return res.data;
  },

  updateLayouts: async (dashboardId: string, layouts: Array<{ id: string; layout: WidgetLayout }>): Promise<void> => {
    await api.patch(`/dashboards/${dashboardId}/widgets/layouts`, { layouts });
  },

  deleteWidget: async (dashboardId: string, widgetId: string): Promise<void> => {
    await api.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`);
  },

  duplicateWidget: async (dashboardId: string, widgetId: string): Promise<DashboardWidget> => {
    const res = await api.post(`/dashboards/${dashboardId}/widgets/${widgetId}/duplicate`);
    return res.data;
  },

  // ─── Templates ───────────────────────────────────────────────────────────────
  fetchTemplates: async () => {
    const res = await api.get('/dashboards/templates');
    return res.data;
  },

  createFromTemplate: async (templateId: string, name?: string): Promise<Dashboard> => {
    const res = await api.post(`/dashboards/from-template/${templateId}`, { name });
    return res.data;
  },

  // ─── Analytics Data ──────────────────────────────────────────────────────────
  fetchKPIs: async () => {
    const res = await api.get('/analytics/kpis');
    return res.data;
  },

  fetchDepartmentBreakdown: async () => {
    const res = await api.get('/analytics/department-breakdown');
    return res.data;
  },

  fetchLeaderboard: async () => {
    const res = await api.get('/analytics/leaderboard');
    return res.data;
  },

  fetchDeadlines: async () => {
    const res = await api.get('/analytics/deadlines');
    return res.data;
  },

  fetchHeatmap: async () => {
    const res = await api.get('/analytics/heatmap');
    return res.data;
  },

  fetchInsights: async () => {
    const res = await api.get('/analytics/insights');
    return res.data;
  },

  fetchTargets: async () => {
    const res = await api.get('/targets');
    return res.data;
  },
};
