import type { WidgetType, WidgetConfig, WidgetLayout } from '../types/dashboard.types';

export interface TemplateWidget {
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  layout: WidgetLayout;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  color: string;
  previewWidgets: string[]; // widget types shown in preview
  widgets: TemplateWidget[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  // ── Executive Summary ────────────────────────────────────────────────────────
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level KPIs, RAG distribution, and performance trends for leadership.',
    category: 'Leadership',
    emoji: '📊',
    color: '#6366f1',
    previewWidgets: ['kpi_card', 'rag_pie', 'bar_chart', 'completion_gauge'],
    widgets: [
      { type: 'kpi_card', title: 'Total Targets', config: { metric: 'total', colorScheme: 'indigo' }, layout: { x: 0, y: 0, w: 3, h: 3 } },
      { type: 'kpi_card', title: 'Completed', config: { metric: 'completed', colorScheme: 'green' }, layout: { x: 3, y: 0, w: 3, h: 3 } },
      { type: 'kpi_card', title: 'At Risk', config: { metric: 'atRisk', colorScheme: 'amber' }, layout: { x: 6, y: 0, w: 3, h: 3 } },
      { type: 'kpi_card', title: 'Off Track', config: { metric: 'offTrack', colorScheme: 'red' }, layout: { x: 9, y: 0, w: 3, h: 3 } },
      { type: 'rag_pie', title: 'RAG Distribution', config: { showLegend: true }, layout: { x: 0, y: 3, w: 4, h: 5 } },
      { type: 'completion_gauge', title: 'Avg Completion', config: {}, layout: { x: 4, y: 3, w: 4, h: 5 } },
      { type: 'bar_chart', title: 'Department Overview', config: { chartType: 'stacked' }, layout: { x: 8, y: 3, w: 4, h: 5 } },
      { type: 'ai_insights', title: 'AI Insights', config: {}, layout: { x: 0, y: 8, w: 6, h: 5 } },
      { type: 'deadlines', title: 'Upcoming Deadlines', config: { maxItems: 8 }, layout: { x: 6, y: 8, w: 6, h: 5 } },
    ],
  },

  // ── RAG Deep Dive ────────────────────────────────────────────────────────────
  {
    id: 'rag-deep-dive',
    name: 'RAG Deep Dive',
    description: 'Detailed Red-Amber-Green status breakdown across departments and trends.',
    category: 'Operations',
    emoji: '🎯',
    color: '#10b981',
    previewWidgets: ['rag_pie', 'bar_chart', 'heatmap', 'funnel'],
    widgets: [
      { type: 'rag_pie', title: 'Overall RAG Status', config: { showLegend: true }, layout: { x: 0, y: 0, w: 4, h: 5 } },
      { type: 'funnel', title: 'Target Completion Funnel', config: {}, layout: { x: 4, y: 0, w: 4, h: 5 } },
      { type: 'speedometer', title: 'Health Score', config: {}, layout: { x: 8, y: 0, w: 4, h: 5 } },
      { type: 'bar_chart', title: 'Department RAG Breakdown', config: { chartType: 'stacked' }, layout: { x: 0, y: 5, w: 8, h: 5 } },
      { type: 'comparison_matrix', title: 'Dept × RAG Matrix', config: {}, layout: { x: 8, y: 5, w: 4, h: 5 } },
      { type: 'heatmap', title: 'Activity Heatmap', config: {}, layout: { x: 0, y: 10, w: 12, h: 4 } },
    ],
  },

  // ── Deadline Tracker ─────────────────────────────────────────────────────────
  {
    id: 'deadline-tracker',
    name: 'Deadline Tracker',
    description: 'Monitor upcoming and overdue deadlines with risk signals and velocity.',
    category: 'Operations',
    emoji: '⏰',
    color: '#f59e0b',
    previewWidgets: ['deadlines', 'speedometer', 'kpi_card', 'timeline_snapshot'],
    widgets: [
      { type: 'kpi_card', title: 'Due This Week', config: { metric: 'upcomingDeadlines', colorScheme: 'amber' }, layout: { x: 0, y: 0, w: 3, h: 3 } },
      { type: 'kpi_card', title: 'Overdue', config: { metric: 'overdue', colorScheme: 'red' }, layout: { x: 3, y: 0, w: 3, h: 3 } },
      { type: 'kpi_card', title: 'Success Rate', config: { metric: 'successRate', colorScheme: 'green' }, layout: { x: 6, y: 0, w: 3, h: 3 } },
      { type: 'speedometer', title: 'Overall Health', config: {}, layout: { x: 9, y: 0, w: 3, h: 3 } },
      { type: 'deadlines', title: 'Upcoming Deadlines', config: { maxItems: 10 }, layout: { x: 0, y: 3, w: 6, h: 6 } },
      { type: 'timeline_snapshot', title: 'Nearest Deadlines Timeline', config: {}, layout: { x: 6, y: 3, w: 6, h: 6 } },
      { type: 'scatter_plot', title: 'Risk Quadrant', config: {}, layout: { x: 0, y: 9, w: 12, h: 5 } },
    ],
  },

  // ── People & Performance ─────────────────────────────────────────────────────
  {
    id: 'people-performance',
    name: 'People & Performance',
    description: 'Track employee contributions, team rankings, and activity across the organization.',
    category: 'HR & People',
    emoji: '👥',
    color: '#06b6d4',
    previewWidgets: ['leaderboard', 'scatter_plot', 'activity_feed', 'dept_progress'],
    widgets: [
      { type: 'kpi_card', title: 'Total Targets', config: { metric: 'total', colorScheme: 'cyan' }, layout: { x: 0, y: 0, w: 4, h: 3 } },
      { type: 'kpi_card', title: 'Avg Completion', config: { metric: 'avgCompletionPct', colorScheme: 'blue' }, layout: { x: 4, y: 0, w: 4, h: 3 } },
      { type: 'kpi_card', title: 'Success Rate', config: { metric: 'successRate', colorScheme: 'green' }, layout: { x: 8, y: 0, w: 4, h: 3 } },
      { type: 'leaderboard', title: 'Employee Leaderboard', config: { maxItems: 10 }, layout: { x: 0, y: 3, w: 5, h: 7 } },
      { type: 'scatter_plot', title: 'Progress vs Risk', config: {}, layout: { x: 5, y: 3, w: 7, h: 7 } },
      { type: 'dept_progress', title: 'Department Progress', config: {}, layout: { x: 0, y: 10, w: 8, h: 4 } },
      { type: 'activity_feed', title: 'Live Activity', config: { maxItems: 10 }, layout: { x: 8, y: 10, w: 4, h: 4 } },
    ],
  },
];
