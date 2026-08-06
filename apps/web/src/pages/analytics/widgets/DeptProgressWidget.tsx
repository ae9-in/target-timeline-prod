import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const DeptProgressWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { departmentBreakdown } = analyticsData;

  if (departmentBreakdown.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No department data</div>;
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {departmentBreakdown.map((dept) => {
          const healthPct = dept.total > 0 ? Math.round((dept.green / dept.total) * 100) : 0;
          const healthColor = healthPct >= 70 ? '#10b981' : healthPct >= 40 ? '#f59e0b' : '#ef4444';

          return (
            <div key={dept.department} style={{
              background: '#0f1019', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px', overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {/* Color bar */}
              <div style={{ height: '3px', background: healthColor, opacity: 0.8 }} />

              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e7eb', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dept.department}
                </div>

                {/* RAG pills */}
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '10px' }}>
                  <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 6px', borderRadius: '9999px' }}>●{dept.green}</span>
                  <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: '9999px' }}>●{dept.amber}</span>
                  <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '9999px' }}>●{dept.red}</span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                    <span>Avg Progress</span>
                    <span style={{ fontWeight: 700, color: '#9ca3af' }}>{dept.avgProgress}%</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{
                      height: '100%', borderRadius: '9999px',
                      width: `${dept.avgProgress}%`,
                      background: `linear-gradient(90deg, ${healthColor}80, ${healthColor})`,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'right' }}>
                  {dept.total} total targets
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
