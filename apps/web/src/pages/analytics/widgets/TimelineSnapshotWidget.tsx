import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

const RAG_COLORS: Record<string, string> = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };

export const TimelineSnapshotWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const upcoming = analyticsData.deadlines?.upcoming || [];

  const displayed = upcoming.slice(0, 6);
  const today = Date.now();

  if (!displayed.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '12px' }}>No upcoming deadlines</div>
  );

  // Find the range for the mini-Gantt
  const dates = displayed.map(d => new Date(d.deadline).getTime());
  const minDate = Math.min(today, ...dates);
  const maxDate = Math.max(...dates);
  const range = Math.max(maxDate - minDate, 86400000 * 14); // at least 14 days

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, flexShrink: 0 }}>Nearest Deadlines · Mini Timeline</div>

      {/* Timeline bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        {displayed.map((item, i) => {
          const deadline = new Date(item.deadline).getTime();
          const startOffset = ((today - minDate) / range) * 100;
          const endOffset = ((deadline - minDate) / range) * 100;
          const left = Math.min(startOffset, endOffset);
          const width = Math.abs(endOffset - startOffset);
          const color = RAG_COLORS[item.ragStatus] || '#6366f1';
          const isOverdue = deadline < today;

          return (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Label */}
              <div style={{ width: '100px', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '9px', color: '#4b5563' }}>
                  {new Date(item.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>
              </div>

              {/* Bar track */}
              <div style={{ flex: 1, height: '20px', position: 'relative', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                {/* Today marker */}
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${startOffset}%`,
                  width: '2px',
                  background: 'rgba(255,255,255,0.15)',
                  zIndex: 2,
                }} />
                {/* Target bar */}
                <div style={{
                  position: 'absolute', top: '3px', bottom: '3px',
                  left: `${Math.max(0, Math.min(left, 98))}%`,
                  width: `${Math.max(4, Math.min(width, 100 - left))}%`,
                  borderRadius: '3px',
                  background: isOverdue
                    ? `linear-gradient(90deg, ${color}99, ${color}cc)`
                    : `linear-gradient(90deg, ${color}44, ${color}99)`,
                  border: `1px solid ${color}40`,
                  transition: 'all 0.4s ease',
                }} />
              </div>

              {/* RAG dot */}
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            </div>
          );
        })}

        {/* Today label */}
        <div style={{ fontSize: '9px', color: '#4b5563', textAlign: 'center', marginTop: '2px' }}>
          ◆ Today · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
};
