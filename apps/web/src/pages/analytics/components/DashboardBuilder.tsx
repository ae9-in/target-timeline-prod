import React, { useState } from 'react';
import { Edit3, Check, Plus, Copy, Trash2, Star, StarOff, RefreshCw, Clock, ChevronDown } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import type { RefreshInterval } from '../hooks/useDashboardData';

interface Props {
  onAddWidget: () => void;
}

const REFRESH_LABELS: Record<RefreshInterval, string> = {
  '30s': 'Every 30s',
  '1m': 'Every 1m',
  '5m': 'Every 5m',
  'off': 'Off',
};

export const DashboardBuilder: React.FC<Props> = ({ onAddWidget }) => {
  const {
    activeDashboard, isEditMode, setIsEditMode,
    createDashboard, renameDashboard, deleteDashboard, cloneDashboard, toggleStar,
    dashboards, selectDashboard,
    refreshData, lastRefreshed, refreshInterval, setRefreshInterval,
  } = useDashboard();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDashList, setShowDashList] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDashboard({ name: newName.trim(), color: '#6366f1' });
    setNewName('');
    setShowCreate(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* Dashboard Selector */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowDashList(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#e5e7eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeDashboard?.name || 'Select Dashboard'}
          </span>
          <ChevronDown size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
        </button>

        {showDashList && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: '220px',
            background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '6px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            marginTop: '4px',
          }} onMouseLeave={() => setShowDashList(false)}>
            {dashboards.map(d => (
              <button key={d.id} onClick={() => { selectDashboard(d.id); setShowDashList(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                background: d.id === activeDashboard?.id ? 'rgba(99,102,241,0.12)' : 'none',
                color: d.id === activeDashboard?.id ? '#818cf8' : '#e5e7eb',
                fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, textAlign: 'left',
              }}
                onMouseEnter={e => d.id !== activeDashboard?.id && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => d.id !== activeDashboard?.id && ((e.currentTarget as HTMLElement).style.background = 'none')}
              >
                {d.isStarred && <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b', flexShrink: 0 }} />}
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <span style={{ fontSize: '10px', color: '#6b7280', flexShrink: 0 }}>{d.widgetCount || 0}w</span>
              </button>
            ))}
            {dashboards.length === 0 && <div style={{ padding: '10px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>No dashboards yet</div>}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

      {/* New Dashboard */}
      {showCreate ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
            placeholder="Dashboard name..."
            style={{ padding: '6px 10px', borderRadius: '7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.4)', color: '#f3f4f6', fontSize: '12px', outline: 'none', fontFamily: 'inherit', width: '160px' }}
          />
          <button onClick={handleCreate} style={{ padding: '6px 10px', borderRadius: '7px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Create</button>
          <button onClick={() => setShowCreate(false)} style={{ padding: '6px 10px', borderRadius: '7px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 10px', borderRadius: '7px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>
          <Plus size={13} /> New
        </button>
      )}

      {activeDashboard && (
        <>
          {/* Star */}
          <button onClick={() => toggleStar(activeDashboard.id)} title={activeDashboard.isStarred ? 'Unstar' : 'Star'} style={{ padding: '7px', borderRadius: '7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: activeDashboard.isStarred ? '#f59e0b' : '#6b7280', display: 'flex', alignItems: 'center' }}>
            {activeDashboard.isStarred ? <Star size={14} style={{ fill: '#f59e0b' }} /> : <StarOff size={14} />}
          </button>

          {/* Clone */}
          <button onClick={() => cloneDashboard(activeDashboard.id)} title="Clone Dashboard" style={{ padding: '7px', borderRadius: '7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
            <Copy size={14} />
          </button>

          {/* Delete */}
          <button onClick={() => { if (confirm(`Delete "${activeDashboard.name}"?`)) deleteDashboard(activeDashboard.id); }} title="Delete Dashboard" style={{ padding: '7px', borderRadius: '7px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={14} />
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

          {/* Edit Mode Toggle */}
          <button onClick={() => setIsEditMode(!isEditMode)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, transition: 'all 0.2s',
            background: isEditMode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
            color: isEditMode ? '#818cf8' : '#9ca3af',
            boxShadow: isEditMode ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
          }}>
            {isEditMode ? <><Check size={13} /> Done Editing</> : <><Edit3 size={13} /> Edit Layout</>}
          </button>

          {/* Add Widget (only in edit mode) */}
          {isEditMode && (
            <button onClick={onAddWidget} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }}>
              <Plus size={13} /> Add Widget
            </button>
          )}
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Refresh Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {lastRefreshed && (
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
        <button onClick={refreshData} title="Refresh now" style={{ padding: '7px', borderRadius: '7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={13} />
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowRefresh(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', borderRadius: '7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: '#9ca3af', fontSize: '11px', fontFamily: 'inherit' }}>
            <Clock size={11} /> {REFRESH_LABELS[refreshInterval]}
          </button>
          {showRefresh && (
            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: '4px' }} onMouseLeave={() => setShowRefresh(false)}>
              {(Object.keys(REFRESH_LABELS) as RefreshInterval[]).map(k => (
                <button key={k} onClick={() => { setRefreshInterval(k); setShowRefresh(false); }} style={{ display: 'block', width: '100%', padding: '7px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: k === refreshInterval ? 'rgba(99,102,241,0.1)' : 'none', color: k === refreshInterval ? '#818cf8' : '#e5e7eb', fontSize: '12px', fontFamily: 'inherit', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {REFRESH_LABELS[k]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
