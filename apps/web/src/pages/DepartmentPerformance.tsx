import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDepartments } from '../context/DepartmentContext';
import ReactECharts from 'echarts-for-react';

export const DepartmentPerformance: React.FC = () => {
  const { api } = useAuth();
  const { departments } = useDepartments();
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        const res = await api.get('/targets');
        setTargets(res.data);
      } catch (err) {
        console.error('Error fetching targets for performance', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTargets();
  }, [api]);

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading performance analytics...</div>;
  }

  // Calculate stats by department dynamically
  const verticals = departments.map((d) => d.name);
  
  const performanceData = verticals.map(v => {
    const vTargets = targets.filter(t => t.vertical === v);
    const total = vTargets.length;
    const green = vTargets.filter(t => t.ragStatus === 'GREEN').length;
    const amber = vTargets.filter(t => t.ragStatus === 'AMBER').length;
    const red = vTargets.filter(t => t.ragStatus === 'RED').length;
    
    // Average gap (percentage points behind expected)
    const totalGap = vTargets.reduce((sum, t) => sum + (t.gap || 0), 0);
    const avgGap = total > 0 ? (totalGap / total) * 100 : 0;
    
    // Average progress
    const totalProgress = vTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0);
    const avgProgress = total > 0 ? (totalProgress / total) * 100 : 0;

    return {
      vertical: v,
      total,
      green,
      amber,
      red,
      avgGap: Math.round(avgGap * 10) / 10,
      avgProgress: Math.round(avgProgress * 10) / 10
    };
  });

  // Chart 1: RAG Distribution Stacked Bar Chart
  const ragDistributionOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['On Track (Green)', 'At Risk (Amber)', 'Off Track (Red)'],
      textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans' },
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    yAxis: {
      type: 'category',
      data: verticals,
      axisLabel: { color: '#9ca3af', fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
    },
    series: [
      {
        name: 'On Track (Green)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: performanceData.map(d => d.green),
        itemStyle: { color: '#10b981' }
      },
      {
        name: 'At Risk (Amber)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: performanceData.map(d => d.amber),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: 'Off Track (Red)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: performanceData.map(d => d.red),
        itemStyle: { color: '#ef4444' }
      }
    ]
  };

  // Chart 2: Average Progress Gap Bar Chart
  const progressGapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}% behind expected progress'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: verticals,
      axisLabel: { color: '#9ca3af', fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        type: 'bar',
        data: performanceData.map(d => d.avgGap),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#ef4444' }, // Red at top (larger gap)
              { offset: 1, color: '#f59e0b' }  // Amber at bottom
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '40%'
      }
    ]
  };

  return (
    <div className="content-container">
      {/* Grid of Department Stats Summary */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {performanceData.map(d => (
          <div key={d.vertical} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '18px', fontWeight: '800' }}>
              {d.vertical}
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Targets:</span>
              <span style={{ fontWeight: '700' }}>{d.total}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Avg. Progress:</span>
              <span style={{ fontWeight: '700', color: 'var(--color-accent)' }}>{d.avgProgress}%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Avg. Pace Gap:</span>
              <span style={{ fontWeight: '700', color: d.avgGap > 10 ? 'var(--color-rag-red)' : d.avgGap > 0 ? 'var(--color-rag-amber)' : 'var(--color-rag-green)' }}>
                {d.avgGap > 0 ? `-${d.avgGap}%` : 'On Track'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-cols-2">
        {/* RAG Status Distribution Card */}
        <div className="glass-card">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold' }}>
            Targets Status Distribution
          </h3>
          <div style={{ height: '300px' }}>
            <ReactECharts option={ragDistributionOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Progress Pace Gap Card */}
        <div className="glass-card">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold' }}>
            Average Progress Gap (% Behind Expected)
          </h3>
          <div style={{ height: '300px' }}>
            <ReactECharts option={progressGapOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
