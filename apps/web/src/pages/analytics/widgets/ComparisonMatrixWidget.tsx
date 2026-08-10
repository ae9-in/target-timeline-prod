import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

const RAG_COLORS = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };
const RAG_LABELS = { GREEN: 'On Track', AMBER: 'At Risk', RED: 'Off Track' };

export const ComparisonMatrixWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { departmentBreakdown } = analyticsData;

  if (!departmentBreakdown.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '12px' }}>No data</div>
  );

  const statuses = ['GREEN', 'AMBER', 'RED'] as const;
  const depts = departmentBreakdown.slice(0, 8);
  const maxVal = Math.max(...depts.flatMap(d => [d.green, d.amber, d.red])) || 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '4px', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', color: '#4b5563' }} />
        {statuses.map(s => (
          <div key={s} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: RAG_COLORS[s] }}>
            {RAG_LABELS[s]}
          </div>
        ))}
      </div>

      {/* Data rows */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {depts.map(dept => (
          <div key={dept.department} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '4px', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dept.department}
            </div>
            {(['green', 'amber', 'red'] as const).map((key, i) => {
              const count = dept[key];
              const intensity = count / maxVal;
              const color = RAG_COLORS[statuses[i]];
              return (
                <div key={key} style={{
                  height: '32px', borderRadius: '6px',
                  background: `${color}${Math.round(intensity * 0.6 * 255).toString(16).padStart(2, '0')}`,
                  border: `1px solid ${color}${count > 0 ? '25' : '10'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: count > 0 ? color : '#2d2f3a' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
