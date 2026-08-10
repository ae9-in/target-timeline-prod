import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const DonutChartWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { kpis } = analyticsData;

  const completed = kpis?.completed ?? 0;
  const total = kpis?.total ?? 0;
  const remaining = total - completed;

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: '#1e2030', borderColor: 'rgba(255,255,255,0.08)', textStyle: { color: '#f3f4f6' } },
    series: [{
      type: 'pie', radius: ['55%', '78%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: 6, borderColor: '#12131e', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#f3f4f6' },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
      },
      data: [
        { value: completed, name: 'Completed', itemStyle: { color: '#10b981' } },
        { value: remaining, name: 'Remaining', itemStyle: { color: 'rgba(255,255,255,0.06)' } },
      ],
    }],
    graphic: [{
      type: 'text', left: 'center', top: '38%',
      style: { text: `${total > 0 ? Math.round((completed / total) * 100) : 0}%`, fill: '#f3f4f6', font: 'bold 28px Plus Jakarta Sans' },
    }, {
      type: 'text', left: 'center', top: '50%',
      style: { text: 'Done', fill: '#9ca3af', font: '12px Plus Jakarta Sans' },
    }],
  }), [completed, total, remaining]);

  return (
    <div style={{ height: '100%', minHeight: '200px' }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};
