import React, { memo, Suspense } from 'react';
import type { DashboardWidget } from '../types/dashboard.types';
import { KPICardWidget } from '../widgets/KPICardWidget';
import { RAGPieWidget } from '../widgets/RAGPieWidget';
import { CompletionGaugeWidget } from '../widgets/CompletionGaugeWidget';
import { BarChartWidget } from '../widgets/BarChartWidget';
import { LineChartWidget } from '../widgets/LineChartWidget';
import { HeatmapWidget } from '../widgets/HeatmapWidget';
import { LeaderboardWidget } from '../widgets/LeaderboardWidget';
import { ActivityFeedWidget } from '../widgets/ActivityFeedWidget';
import { AIInsightsWidget } from '../widgets/AIInsightsWidget';
import { DeadlineWidget } from '../widgets/DeadlineWidget';
import { DeptProgressWidget } from '../widgets/DeptProgressWidget';
import { ProgressCardWidget } from '../widgets/ProgressCardWidget';
import { DrillDownTableWidget } from '../widgets/DrillDownTableWidget';
import { DonutChartWidget } from '../widgets/DonutChartWidget';
import { AreaChartWidget } from '../widgets/AreaChartWidget';

interface Props {
  widget: DashboardWidget;
}

const WidgetFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '12px' }}>
    Unknown widget type
  </div>
);

const WIDGET_MAP: Record<string, React.ComponentType<{ config: any; title: string }>> = {
  kpi_card: KPICardWidget,
  rag_pie: RAGPieWidget,
  completion_gauge: CompletionGaugeWidget,
  bar_chart: BarChartWidget,
  line_chart: LineChartWidget,
  heatmap: HeatmapWidget,
  leaderboard: LeaderboardWidget,
  activity_feed: ActivityFeedWidget,
  ai_insights: AIInsightsWidget,
  deadlines: DeadlineWidget,
  dept_progress: DeptProgressWidget,
  progress_card: ProgressCardWidget,
  drill_table: DrillDownTableWidget,
  donut_chart: DonutChartWidget,
  area_chart: AreaChartWidget,
};

export const WidgetRenderer = memo(({ widget }: Props) => {
  const Component = WIDGET_MAP[widget.type] || WidgetFallback;
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>Loading...</div>}>
      <Component config={widget.config} title={widget.title} />
    </Suspense>
  );
});

WidgetRenderer.displayName = 'WidgetRenderer';
