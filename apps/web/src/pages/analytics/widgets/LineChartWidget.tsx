import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const LineChartWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();

  // Use heatmap data to show activity trend
  const heatmap = analyticsData.heatmap.slice(-30);

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1e2030', borderColor: 'rgba(255,255,255,0.08)', textStyle: { color: '#f3f4f6' } },
    legend: { data: ['Updates', 'On Track', 'Off Track'], textStyle: { color: '#9ca3af', fontSize: 11 }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: heatmap.map(h => h.date.slice(5)), // MM-DD
      axisLabel: { color: '#9ca3af', fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    series: [
      {
        name: 'Updates', type: 'line', smooth: true, symbol: 'none',
        itemStyle: { color: '#6366f1' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#6366f130' }, { offset: 1, color: '#6366f100' }] } },
        data: heatmap.map(h => h.updates),
      },
      {
        name: 'On Track', type: 'line', smooth: true, symbol: 'none',
        itemStyle: { color: '#10b981' },
        data: heatmap.map(h => h.green),
      },
      {
        name: 'Off Track', type: 'line', smooth: true, symbol: 'none',
        itemStyle: { color: '#ef4444' },
        data: heatmap.map(h => h.red),
      },
    ],
  }), [heatmap]);

  if (heatmap.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No historical data yet</div>;
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '200px' }} />;
};
