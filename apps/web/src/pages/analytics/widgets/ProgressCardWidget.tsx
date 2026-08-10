import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const ProgressCardWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData } = useDashboard();
  const { kpis } = analyticsData;

  const metric = config.metric || 'successRate';
  const metrics: Record<string, { label: string; value: number; color: string; desc: string }> = {
    successRate: { label: 'Success Rate', value: kpis?.successRate ?? 0, color: '#10b981', desc: 'Targets completed successfully' },
    avgCompletionPct: { label: 'Average Completion', value: kpis?.avgCompletionPct ?? 0, color: '#6366f1', desc: 'Average progress across all targets' },
  };

  const m = metrics[metric] || metrics.successRate;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px', padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f3f4f6' }}>{m.value}%</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', marginTop: '2px' }}>{m.label}</div>
        </div>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${m.color} ${m.value * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%', background: '#12131e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 800, color: m.color,
          }}>
            {m.value}%
          </div>
        </div>
      </div>

      <div>
        <div style={{ height: '8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '9999px',
            width: `${m.value}%`,
            background: `linear-gradient(90deg, ${m.color}80, ${m.color})`,
            transition: 'width 1s ease',
          }} />
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>{m.desc}</div>
      </div>
    </div>
  );
};
