import React, { useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props { config: any; title: string; }

const RAG_COLORS: Record<string, string> = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };
const RAG_BG: Record<string, string> = { GREEN: 'rgba(16,185,129,0.08)', AMBER: 'rgba(245,158,11,0.08)', RED: 'rgba(239,68,68,0.08)' };

export const TargetCardsWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData, applyFilter } = useDashboard();
  const [mode, setMode] = useState<'top' | 'bottom'>('top');
  const targets = applyFilter(analyticsData.targets);
  const maxItems = config.maxItems || 5;

  const sorted = [...targets].sort((a: any, b: any) => {
    const ap = a.scopeCompletionPct ?? 0;
    const bp = b.scopeCompletionPct ?? 0;
    return mode === 'top' ? bp - ap : ap - bp;
  }).slice(0, maxItems);

  if (!sorted.length) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '12px' }}>No targets</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {(['top', 'bottom'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit',
            background: mode === m ? (m === 'top' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)',
            color: mode === m ? (m === 'top' ? '#10b981' : '#ef4444') : '#6b7280',
            transition: 'all 0.15s',
          }}>
            {m === 'top' ? <><TrendingUp size={10} style={{ display: 'inline', marginRight: '3px' }} />Top</> : <><TrendingDown size={10} style={{ display: 'inline', marginRight: '3px' }} />Bottom</>}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {sorted.map((target: any, i: number) => {
          const pct = Math.round(target.scopeCompletionPct ?? 0);
          const rag = target.ragStatus || 'GREEN';
          const color = RAG_COLORS[rag];
          return (
            <div key={target.id || i} style={{
              padding: '9px 12px', borderRadius: '8px',
              background: RAG_BG[rag],
              border: `1px solid ${color}20`,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                background: `${color}20`, border: `1px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 800, color,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {target.name || 'Unnamed Target'}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>
                  {target.vertical || target.owner || '—'}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', color, flexShrink: 0 }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
