import React, { useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

const MEDAL_COLORS = ['#f59e0b', '#9ca3af', '#cd7c2f'];
const RANK_BG = ['rgba(245,158,11,0.08)', 'rgba(156,163,175,0.08)', 'rgba(205,124,47,0.08)'];

export const LeaderboardWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData } = useDashboard();
  const { leaderboard } = analyticsData;
  const maxItems = config.maxItems || 10;
  const items = leaderboard.slice(0, maxItems);

  if (analyticsData.loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>Loading...</div>;
  }

  if (items.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>No employee data</div>;
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, index) => (
          <div key={item.owner} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '8px',
            background: index < 3 ? RANK_BG[index] : 'rgba(255,255,255,0.01)',
            border: `1px solid ${index < 3 ? `${MEDAL_COLORS[index]}20` : 'rgba(255,255,255,0.04)'}`,
            transition: 'all 0.2s',
          }}>
            {/* Rank */}
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 800,
              color: index < 3 ? MEDAL_COLORS[index] : '#6b7280',
              background: index < 3 ? `${MEDAL_COLORS[index]}15` : 'rgba(255,255,255,0.04)',
            }}>
              {index < 3 ? (
                <Trophy size={14} style={{ color: MEDAL_COLORS[index] }} />
              ) : (
                `#${index + 1}`
              )}
            </div>

            {/* Avatar */}
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, #6366f1, #06b6d4)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff',
            }}>
              {item.owner.charAt(0).toUpperCase()}
            </div>

            {/* Name + dept */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.owner}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{item.department} · {item.total} targets</div>
            </div>

            {/* Score bar */}
            <div style={{ width: '60px', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444', textAlign: 'right', marginBottom: '3px' }}>
                {item.score}%
              </div>
              <div style={{ height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{
                  height: '100%', borderRadius: '9999px',
                  width: `${item.score}%`,
                  background: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444',
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
