// ─── Dashboard System Types ────────────────────────────────────────────────────

export type WidgetType =
  | 'kpi_card'
  | 'rag_pie'
  | 'completion_gauge'
  | 'bar_chart'
  | 'line_chart'
  | 'heatmap'
  | 'leaderboard'
  | 'activity_feed'
  | 'ai_insights'
  | 'deadlines'
  | 'dept_progress'
  | 'progress_card'
  | 'drill_table'
  | 'donut_chart'
  | 'area_chart'
  // New advanced widgets
  | 'waterfall'
  | 'scatter_plot'
  | 'funnel'
  | 'speedometer'
  | 'comparison_matrix'
  | 'target_cards'
  | 'rich_text'
  | 'timeline_snapshot';

export type WidgetCategory =
  | 'KPI & Metrics'
  | 'Charts'
  | 'Tables & Lists'
  | 'AI & Insights';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetConfig {
  metric?: string;
  colorScheme?: string;
  filters?: Record<string, string>;
  showLegend?: boolean;
  chartType?: string;
  maxItems?: number;
  refreshInterval?: number;
  [key: string]: any;
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  layout: WidgetLayout;
  isLocked: boolean;
  isHidden: boolean;
  order: number;
  createdAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  widgets: DashboardWidget[];
  isStarred?: boolean;
  lastViewedAt?: string;
  widgetCount?: number;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  isSystem: boolean;
  config: {
    icon?: string;
    color?: string;
    widgets: Array<{
      type: WidgetType;
      title: string;
      config: WidgetConfig;
      layout: WidgetLayout;
    }>;
  };
}

export interface SavedFilter {
  id: string;
  name: string;
  config: GlobalFilter;
}

export interface GlobalFilter {
  location?: string;
  department?: string;
  owner?: string;
  ragStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}

// ─── Analytics Data Types ──────────────────────────────────────────────────────

export interface KPIData {
  total: number;
  completed: number;
  overdue: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  avgCompletionPct: number;
  avgDelay: number;
  avgCompletionTime: number;
  successRate: number;
  upcomingDeadlines: number;
  completionVelocity: number;
}

export interface DepartmentBreakdownItem {
  department: string;
  green: number;
  amber: number;
  red: number;
  total: number;
  avgProgress: number;
}

export interface LeaderboardItem {
  owner: string;
  department: string;
  green: number;
  amber: number;
  red: number;
  total: number;
  score: number;
}

export interface DeadlineItem {
  id: string;
  name: string;
  owner: string;
  vertical: string;
  deadline: string;
  daysLeft?: number;
  daysOverdue?: number;
  ragStatus: 'GREEN' | 'AMBER' | 'RED';
  progress: number;
}

export interface HeatmapDataPoint {
  date: string;
  updates: number;
  green: number;
  amber: number;
  red: number;
}

export interface Insight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  metric?: string;
}

export interface AnalyticsData {
  kpis: KPIData | null;
  departmentBreakdown: DepartmentBreakdownItem[];
  leaderboard: LeaderboardItem[];
  deadlines: { upcoming: DeadlineItem[]; missed: DeadlineItem[] } | null;
  heatmap: HeatmapDataPoint[];
  insights: Insight[];
  targets: any[];
  loading: boolean;
  error: string | null;
}

// ─── Widget Registry Entry ─────────────────────────────────────────────────────

export interface WidgetRegistryEntry {
  type: WidgetType;
  label: string;
  description: string;
  category: WidgetCategory;
  defaultLayout: WidgetLayout;
  defaultConfig: WidgetConfig;
  icon: any;
  minW: number;
  minH: number;
}
