import React from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { useNavigate } from 'react-router-dom';

interface Props { config: any; title: string; }

const RAG_COLORS = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };

export const DeadlineWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData } = useDashboard();
  const navigate = useNavigate();
  const { deadlines } = analyticsData;
  const maxItems = config.maxItems || 8;
  const [tab, setTab] = React.useState<'upcoming' | 'missed'>('upcoming');

  const items = tab === 'upcoming'
    ? (deadlines?.upcoming || []).slice(0, maxItems)
    : (deadlines?.missed || []).slice(0, maxItems);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px' }}>
        {(['upcoming', 'missed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '5px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s',
            background: tab === t ? (t === 'missed' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)') : 'transparent',
            color: tab === t ? (t === 'missed' ? '#f87171' : '#818cf8') : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            {t === 'upcoming' ? <Clock size={12} /> : <AlertCircle size={12} />}
            <span>{t === 'upcoming' ? `Upcoming (${deadlines?.upcoming?.length || 0})` : `Missed (${deadlines?.missed?.length || 0})`}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#6b7280', fontSize: '13px' }}>
            <CheckCircle size={28} style={{ color: '#10b981', opacity: 0.5 }} />
            {tab === 'upcoming' ? 'No upcoming deadlines' : 'No missed deadlines'}
          </div>
        ) : items.map((item) => (
          <div key={item.id}
            onClick={() => navigate(`/targets/${item.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
              borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          >
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: RAG_COLORS[item.ragStatus] || '#6b7280',
              boxShadow: `0 0 6px ${RAG_COLORS[item.ragStatus] || '#6b7280'}60`,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{item.owner} · {item.vertical}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{
                fontSize: '11px', fontWeight: 700,
                color: tab === 'missed' ? '#ef4444' : item.daysLeft! <= 3 ? '#f59e0b' : '#9ca3af',
              }}>
                {tab === 'upcoming' ? `${item.daysLeft}d left` : `${item.daysOverdue}d ago`}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{item.progress}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
