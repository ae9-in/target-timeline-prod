import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

const RAG_COLORS: Record<string, string> = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };

export const ScatterPlotWidget: React.FC<Props> = () => {
  const { analyticsData, applyFilter } = useDashboard();
  const targets = applyFilter(analyticsData.targets);

  const option = useMemo(() => {
    const data = targets.slice(0, 40).map((t: any) => {
      const deadline = t.deadline ? new Date(t.deadline) : null;
      const daysLeft = deadline ? Math.round((deadline.getTime() - Date.now()) / 86400000) : 0;
      return [
        Math.round(t.scopeCompletionPct ?? 0),
        daysLeft,
        t.name || 'Unnamed',
        t.ragStatus || 'GREEN',
      ];
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1e2030',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#f3f4f6' },
        formatter: (params: any) => {
          const d = params.value;
          return `
            <div style="font-weight:700;margin-bottom:4px;">${d[2]}</div>
            <div style="color:#9ca3af;">Progress: <span style="color:#e5e7eb;font-weight:600;">${d[0]}%</span></div>
            <div style="color:#9ca3af;">Days remaining: <span style="color:${d[1] > 0 ? '#10b981' : '#ef4444'};font-weight:600;">${d[1] > 0 ? d[1] : `${Math.abs(d[1])} overdue`}</span></div>
          `;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Progress %',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
        axisLabel: { color: '#6b7280', fontSize: 10 },
        min: 0,
        max: 100
      },
      yAxis: {
        type: 'value',
        name: 'Days Remaining',
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
        axisLabel: { color: '#6b7280', fontSize: 10 }
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 10,
          data: data,
          itemStyle: {
            color: (params: any) => RAG_COLORS[params.value[3]] || '#6366f1'
          }
        }
      ]
    };
  }, [targets]);

  if (!targets.length) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No target data</div>;
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '180px' }} />;
};
