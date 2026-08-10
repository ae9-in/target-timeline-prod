import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const AreaChartWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const heatmap = analyticsData.heatmap.slice(-30);

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1e2030', borderColor: 'rgba(255,255,255,0.08)', textStyle: { color: '#f3f4f6' } },
    grid: { left: '2%', right: '2%', bottom: '10%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: heatmap.map(h => h.date.slice(5)),
      axisLabel: { color: '#6b7280', fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#6b7280', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [{
      type: 'line', smooth: true, symbol: 'none',
      data: heatmap.map(h => h.updates),
      itemStyle: { color: '#6366f1' },
      lineStyle: { width: 2, color: '#6366f1' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.25)' },
            { offset: 1, color: 'rgba(99,102,241,0.01)' },
          ],
        },
      },
    }],
  }), [heatmap]);

  if (heatmap.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No trend data yet</div>;
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '180px' }} />;
};
