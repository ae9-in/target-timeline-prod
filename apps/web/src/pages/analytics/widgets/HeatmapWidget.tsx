import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';
import { Calendar } from 'lucide-react';

interface Props { config: any; title: string; }

export const HeatmapWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { heatmap } = analyticsData;

  const option = useMemo(() => {
    const data = heatmap.map(h => [h.date, h.updates]);
    const maxVal = Math.max(...heatmap.map(h => h.updates), 1);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: any) => `${p.value[0]}: ${p.value[1]} updates`,
        backgroundColor: '#1e2030', borderColor: 'rgba(255,255,255,0.08)', textStyle: { color: '#f3f4f6' },
      },
      visualMap: {
        min: 0, max: maxVal, show: false,
        inRange: { color: ['#12131e', '#6366f150', '#6366f1', '#4f46e5'] },
      },
      calendar: [{
        top: 30, left: 30, right: 10, bottom: 10,
        range: heatmap.length > 0
          ? [heatmap[0].date, heatmap[heatmap.length - 1].date]
          : new Date().getFullYear().toString(),
        splitLine: { show: false },
        itemStyle: { color: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
        dayLabel: { color: '#6b7280', fontSize: 10 },
        monthLabel: { color: '#9ca3af', fontSize: 10 },
        yearLabel: { show: false },
      }],
      series: [{
        type: 'heatmap', coordinateSystem: 'calendar',
        data,
        calendarIndex: 0,
      }],
    };
  }, [heatmap]);

  if (heatmap.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#6b7280' }}>
        <Calendar size={32} style={{ opacity: 0.3 }} />
        <div style={{ fontSize: '13px' }}>No activity recorded yet</div>
      </div>
    );
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '160px' }} />;
};
