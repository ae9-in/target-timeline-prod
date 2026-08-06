import React, { useMemo } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { useNavigate } from 'react-router-dom';

interface Props { config: any; title: string; }

export const ActivityFeedWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData, applyFilter } = useDashboard();
  const navigate = useNavigate();
  const maxItems = config.maxItems || 10;

  const recentTargets = useMemo(() => {
    const filtered = applyFilter(analyticsData.targets);
    return [...filtered]
      .sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.deadline).getTime();
        const bDate = new Date(b.updatedAt || b.deadline).getTime();
        return bDate - aDate;
      })
      .slice(0, maxItems);
  }, [analyticsData.targets, applyFilter, maxItems]);

  const RAG_COLORS: Record<string, string> = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {recentTargets.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px', padding: '40px 0' }}>
            No activity yet
          </div>
        ) : recentTargets.map((t: any) => (
          <div key={t.id}
            onClick={() => navigate(`/targets/${t.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: '7px',
              background: 'rgba(255,255,255,0.01)', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.03)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
          >
            {/* RAG dot */}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: RAG_COLORS[t.ragStatus] || '#6b7280',
              boxShadow: `0 0 5px ${RAG_COLORS[t.ragStatus] || '#6b7280'}50`,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.name}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                {t.owner} · {t.vertical}
              </div>
            </div>

            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>
                {Math.round((t.actualProgress || 0) * 100)}%
              </div>
              <div style={{ fontSize: '10px', color: '#4b5563' }}>
                {formatRelativeTime(t.updatedAt || t.deadline)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
