import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const WaterfallChartWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { departmentBreakdown } = analyticsData;

  const data = useMemo(() => {
    return departmentBreakdown.slice(0, 8).map(d => ({
      name: d.department.length > 12 ? d.department.slice(0, 12) + '…' : d.department,
      value: d.avgProgress,
    }));
  }, [departmentBreakdown]);

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e2030',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#f3f4f6' },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}: <strong>${item.value.toFixed(1)}%</strong> average progress`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { color: '#6b7280', fontSize: 10, rotate: data.length > 4 ? 25 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#6b7280', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      max: 100
    },
    series: [{
      type: 'bar',
      barWidth: '50%',
      data: data.map(d => d.value),
      itemStyle: {
        color: (params: any) => {
          const val = params.value;
          return val >= 75 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444';
        },
        borderRadius: [4, 4, 0, 0]
      }
    }]
  }), [data]);

  if (!departmentBreakdown.length) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No department data</div>;
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '180px' }} />;
};
