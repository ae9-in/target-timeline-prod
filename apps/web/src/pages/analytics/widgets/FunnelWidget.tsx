import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

const STAGES = [
  { key: 'total', label: 'All Targets', color: '#6366f1' },
  { key: 'onTrack', label: 'On Track', color: '#10b981' },
  { key: 'atRisk', label: 'At Risk', color: '#f59e0b' },
  { key: 'completed', label: 'Completed', color: '#06b6d4' },
  { key: 'overdue', label: 'Overdue', color: '#ef4444' },
];

export const FunnelWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { kpis } = analyticsData;

  if (!kpis) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '12px' }}>Loading...</div>;

  const max = kpis.total || 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Completion Funnel</div>
      {STAGES.map((stage, i) => {
        const value = (kpis as any)[stage.key] ?? 0;
        const pct = Math.round((value / max) * 100);
        const width = Math.max(pct, 8);

        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '90px', fontSize: '11px', color: '#9ca3af', fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>
              {stage.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: '28px', display: 'flex', alignItems: 'center' }}>
              {/* Background track */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />
              {/* Fill */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${width}%`,
                borderRadius: '6px',
                background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color}88)`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
              }}>
                {width > 20 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', opacity: 0.9 }}>{value}</span>
                )}
              </div>
            </div>
            <div style={{ width: '32px', fontSize: '10px', color: '#6b7280', fontWeight: 600, flexShrink: 0 }}>
              {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
