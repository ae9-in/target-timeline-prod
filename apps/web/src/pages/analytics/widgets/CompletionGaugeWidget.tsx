import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const CompletionGaugeWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { kpis } = analyticsData;
  const value = kpis?.avgCompletionPct ?? 0;

  const option = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge', startAngle: 180, endAngle: 0,
      center: ['50%', '70%'], radius: '90%',
      min: 0, max: 100, splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 14,
          color: [[0.3, '#ef444480'], [0.7, '#f59e0b80'], [1, '#10b98180']],
        },
      },
      pointer: {
        icon: 'path://M12.8,29.5C12.2,30,11,30,10.4,29.5L1.3,21.5c-0.8-0.7-0.8-2,0-2.7l9.1-8c0.6-0.5,1.8-0.5,2.4,0l0.1,0.1c0.6,0.5,0.6,1.4,0,1.9L5.4,19.2l12.7,11.2c0.6,0.5,0.6,1.4,0,1.9L12.8,29.5z',
        length: '75%', width: 8, offsetCenter: [0, 5],
        itemStyle: { color: 'auto' },
      },
      axisTick: { length: 6, lineStyle: { color: 'auto', width: 2 } },
      splitLine: { length: 14, lineStyle: { color: 'auto', width: 4 } },
      axisLabel: {
        color: '#6b7280', fontSize: 11, distance: -40, rotate: 'tangential',
        formatter: (v: number) => v === 0 ? '0%' : v === 50 ? '50%' : v === 100 ? '100%' : '',
      },
      title: { offsetCenter: [0, '-18%'], fontSize: 12, color: '#9ca3af', fontWeight: 600 },
      detail: {
        fontSize: 30, offsetCenter: [0, '-3%'], valueAnimation: true,
        formatter: '{value}%', color: '#f3f4f6', fontWeight: 800,
      },
      data: [{ value, name: 'Avg Progress' }],
    }],
  };

  return (
    <div style={{ height: '100%', minHeight: '180px' }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};
