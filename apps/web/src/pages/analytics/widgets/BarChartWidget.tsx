import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const BarChartWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData } = useDashboard();
  const { departmentBreakdown } = analyticsData;

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e2030', borderColor: 'rgba(255,255,255,0.08)', textStyle: { color: '#f3f4f6' } },
    legend: { data: ['On Track', 'At Risk', 'Off Track'], textStyle: { color: '#9ca3af', fontSize: 11 }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: departmentBreakdown.map(d => d.department),
      axisLabel: { color: '#9ca3af', fontSize: 11, rotate: departmentBreakdown.length > 4 ? 30 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    series: [
      { name: 'On Track', type: 'bar', stack: config.chartType === 'stacked' ? 'total' : undefined, itemStyle: { color: '#10b981', borderRadius: [0, 0, 0, 0] }, data: departmentBreakdown.map(d => d.green) },
      { name: 'At Risk', type: 'bar', stack: config.chartType === 'stacked' ? 'total' : undefined, itemStyle: { color: '#f59e0b' }, data: departmentBreakdown.map(d => d.amber) },
      { name: 'Off Track', type: 'bar', stack: config.chartType === 'stacked' ? 'total' : undefined, itemStyle: { color: '#ef4444', borderRadius: config.chartType === 'stacked' ? [4, 4, 0, 0] : 0 }, data: departmentBreakdown.map(d => d.red) },
    ],
  }), [departmentBreakdown, config]);

  if (departmentBreakdown.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No department data</div>;
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '200px' }} />;
};
