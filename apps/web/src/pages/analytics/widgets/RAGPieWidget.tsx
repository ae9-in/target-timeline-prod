import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const RAGPieWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData, applyFilter } = useDashboard();
  const targets = useMemo(() => applyFilter(analyticsData.targets), [analyticsData.targets, applyFilter]);

  const green = targets.filter((t: any) => t.ragStatus === 'GREEN').length;
  const amber = targets.filter((t: any) => t.ragStatus === 'AMBER').length;
  const red = targets.filter((t: any) => t.ragStatus === 'RED').length;

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{a}<br/>{b}: {c} ({d}%)' },
    legend: { show: config.showLegend !== false, textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans' }, bottom: '2%', fontSize: 11 },
    series: [{
      name: 'RAG Status', type: 'pie', radius: ['42%', '70%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#12131e', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#f3f4f6' } },
      labelLine: { show: false },
      data: [
        { value: green, name: 'On Track (Green)', itemStyle: { color: '#10b981' } },
        { value: amber, name: 'At Risk (Amber)', itemStyle: { color: '#f59e0b' } },
        { value: red, name: 'Off Track (Red)', itemStyle: { color: '#ef4444' } },
      ],
    }],
  };

  return (
    <div style={{ height: '100%', minHeight: '200px' }}>
      {targets.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No data available</div>
      ) : (
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      )}
    </div>
  );
};
