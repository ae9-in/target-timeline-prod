import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactECharts from 'echarts-for-react';

export const Analytics: React.FC = () => {
  const { api } = useAuth();
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        const res = await api.get('/targets');
        setTargets(res.data);
      } catch (err) {
        console.error('Error fetching targets for analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTargets();
  }, [api]);

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading analytics...</div>;
  }

  // Calculate RAG overall counts
  const greenCount = targets.filter(t => t.ragStatus === 'GREEN').length;
  const amberCount = targets.filter(t => t.ragStatus === 'AMBER').length;
  const redCount = targets.filter(t => t.ragStatus === 'RED').length;
  const totalCount = targets.length;

  // Average completion rate
  const totalCompletion = targets.reduce((sum, t) => sum + (t.actualProgress || 0), 0);
  const avgCompletion = totalCount > 0 ? Math.round((totalCompletion / totalCount) * 100) : 0;

  // Chart 1: RAG Share Pie Chart
  const ragShareOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c} ({d}%)'
    },
    legend: {
      textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans' },
      bottom: '0%'
    },
    series: [
      {
        name: 'RAG Share',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: 'var(--bg-surface)',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#f3f4f6'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: greenCount, name: 'Green (On Track)', itemStyle: { color: '#10b981' } },
          { value: amberCount, name: 'Amber (At Risk)', itemStyle: { color: '#f59e0b' } },
          { value: redCount, name: 'Red (Off Track)', itemStyle: { color: '#ef4444' } }
        ]
      }
    ]
  };

  // Chart 2: Company Completion Gauge
  const completionGaugeOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '90%',
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.3, '#ef4444'],
              [0.7, '#f59e0b'],
              [1, '#10b981']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,29.5C12.2,30,11,30,10.4,29.5L1.3,21.5c-0.8-0.7-0.8-2,0-2.7l9.1-8c0.6-0.5,1.8-0.5,2.4,0l0.1,0.1c0.6,0.5,0.6,1.4,0,1.9L5.4,19.2l12.7,11.2c0.6,0.5,0.6,1.4,0,1.9L12.8,29.5z',
          length: '75%',
          width: 8,
          offsetCenter: [0, 5],
          itemStyle: { color: 'auto' }
        },
        axisTick: {
          length: 6,
          lineStyle: { color: 'auto', width: 2 }
        },
        splitLine: {
          length: 12,
          lineStyle: { color: 'auto', width: 4 }
        },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 12,
          distance: -40,
          rotate: 'tangential',
          formatter: function (value: number) {
            if (value === 0) return '0%';
            if (value === 50) return '50%';
            if (value === 100) return '100%';
            return '';
          }
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 13,
          color: '#9ca3af',
          fontWeight: 600
        },
        detail: {
          fontSize: 32,
          offsetCenter: [0, '-5%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: '#f3f4f6',
          fontWeight: 800
        },
        data: [
          { value: avgCompletion, name: 'Average Progress' }
        ]
      }
    ]
  };

  return (
    <div className="content-container">
      {/* Top statistics cards */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="glass-card text-center">
          <span className="summary-label">Green Ratio</span>
          <span className="summary-value" style={{ color: 'var(--color-rag-green)', marginTop: '8px' }}>
            {totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="glass-card text-center">
          <span className="summary-label">Amber Ratio</span>
          <span className="summary-value" style={{ color: 'var(--color-rag-amber)', marginTop: '8px' }}>
            {totalCount > 0 ? Math.round((amberCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="glass-card text-center">
          <span className="summary-label">Red Ratio</span>
          <span className="summary-value" style={{ color: 'var(--color-rag-red)', marginTop: '8px' }}>
            {totalCount > 0 ? Math.round((redCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="glass-card text-center">
          <span className="summary-label">Active Gaps</span>
          <span className="summary-value" style={{ color: 'var(--color-accent)', marginTop: '8px' }}>
            {targets.filter(t => t.gap > 0).length} Targets
          </span>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* RAG Pie Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold' }}>
            Target Portfolio Health Share
          </h3>
          <div style={{ height: '280px' }}>
            <ReactECharts option={ragShareOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Completion Gauge */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold' }}>
            Company-Wide Target Completion Performance
          </h3>
          <div style={{ height: '280px' }}>
            <ReactECharts option={completionGaugeOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
