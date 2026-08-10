import React, { useState } from 'react';
import {
  Edit3, Check, Plus, Copy, Trash2, Star, StarOff, RefreshCw, Clock,
  ChevronDown, Download, Layout, Wand2, FileText,
} from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import type { RefreshInterval } from '../hooks/useDashboardData';
import { TemplateGallery } from './TemplateGallery';
import { autoLayout } from '../utils/autoLayout';

interface Props {
  onAddWidget: () => void;
}

const REFRESH_LABELS: Record<RefreshInterval, string> = {
  '30s': '30s',
  '1m': '1m',
  '5m': '5m',
  'off': 'Off',
};

const BtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '7px 11px', borderRadius: '8px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#9ca3af', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
  fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
};

export const DashboardBuilder: React.FC<Props> = ({ onAddWidget }) => {
  const {
    activeDashboard, isEditMode, setIsEditMode,
    createDashboard, deleteDashboard, cloneDashboard, toggleStar,
    dashboards, selectDashboard,
    refreshData, lastRefreshed, refreshInterval, setRefreshInterval,
    saveLayouts,
  } = useDashboard();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDashList, setShowDashList] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDashboard({ name: newName.trim(), color: '#6366f1' });
    setNewName('');
    setShowCreate(false);
  };

  const handleAutoLayout = () => {
    if (!activeDashboard) return;
    const newLayouts = autoLayout(activeDashboard.widgets);
    saveLayouts(newLayouts);
  };

  const handleExport = async () => {
    try {
      const gridEl = document.querySelector('.dashboard-grid-layout') as HTMLElement;
      const container = gridEl?.parentElement as HTMLElement;
      if (!container) return;

      // Use CSS print as fallback — open a styled print window
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`
        <html><head><title>${activeDashboard?.name || 'Dashboard'}</title>
        <style>
          body { margin: 0; background: #0a0b10; color: #f3f4f6; font-family: Inter, system-ui, sans-serif; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style></head>
        <body>${container.outerHTML}</body></html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 500);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,16,25,0.98), rgba(18,19,30,0.98))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        position: 'relative', zIndex: 10,
      }}>

        {/* ── Dashboard Selector ────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowDashList(o => !o)} style={{
            ...BtnStyle,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.18)',
            color: '#a5b4fc', padding: '7px 14px',
            maxWidth: '200px',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeDashboard ? '#10b981' : '#6b7280', flexShrink: 0 }} />
            <span style={{ maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeDashboard?.name || 'Select Dashboard'}
            </span>
            <ChevronDown size={12} style={{ color: '#6b7280', flexShrink: 0, marginLeft: '2px' }} />
          </button>

          {showDashList && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, minWidth: '240px',
              background: '#13141f', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '6px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            }} onMouseLeave={() => setShowDashList(false)}>
              <div style={{ padding: '6px 10px 4px', fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Dashboards
              </div>
              {dashboards.map(d => (
                <button key={d.id} onClick={() => { selectDashboard(d.id); setShowDashList(false); }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: d.id === activeDashboard?.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: d.id === activeDashboard?.id ? '#818cf8' : '#d1d5db',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                  onMouseEnter={e => d.id !== activeDashboard?.id && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => d.id !== activeDashboard?.id && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: d.id === activeDashboard?.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {d.isStarred ? <Star size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} /> : <Layout size={12} style={{ color: '#6b7280' }} />}
                  </div>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ fontSize: '10px', color: '#4b5563', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                    {d.widgetCount || 0}w
                  </span>
                </button>
              ))}
              {dashboards.length === 0 && (
                <div style={{ padding: '14px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                  No dashboards yet — create one!
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Divider ───── */}
        <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* ── Create New ───── */}
        {showCreate ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
              placeholder="Dashboard name..."
              style={{
                padding: '7px 10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.4)',
                color: '#f3f4f6', fontSize: '12px', outline: 'none', fontFamily: 'inherit', width: '160px',
              }}
            />
            <button onClick={handleCreate} style={{ ...BtnStyle, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ ...BtnStyle, padding: '7px' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} style={{
            ...BtnStyle,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8',
          }}>
            <Plus size={13} /> New
          </button>
        )}

        {/* ── Template Gallery ───── */}
        <button onClick={() => setShowTemplates(true)} style={{
          ...BtnStyle,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#fbbf24',
        }}>
          <FileText size={13} /> Templates
        </button>

        {activeDashboard && (
          <>
            {/* Star */}
            <button onClick={() => toggleStar(activeDashboard.id)} title={activeDashboard.isStarred ? 'Unstar' : 'Star'} style={{
              ...BtnStyle, padding: '7px 10px',
              color: activeDashboard.isStarred ? '#f59e0b' : '#6b7280',
              background: activeDashboard.isStarred ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeDashboard.isStarred ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {activeDashboard.isStarred ? <Star size={13} style={{ fill: '#f59e0b' }} /> : <StarOff size={13} />}
            </button>

            {/* Clone */}
            <button onClick={() => cloneDashboard(activeDashboard.id)} title="Clone Dashboard" style={{ ...BtnStyle, padding: '7px 10px' }}>
              <Copy size={13} />
            </button>

            {/* Delete */}
            <button onClick={() => { if (confirm(`Delete "${activeDashboard.name}"?`)) deleteDashboard(activeDashboard.id); }}
              title="Delete Dashboard" style={{
                ...BtnStyle, padding: '7px 10px',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.13)', color: '#f87171',
              }}>
              <Trash2 size={13} />
            </button>

            <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* Edit Mode Toggle */}
            <button onClick={() => setIsEditMode(!isEditMode)} style={{
              ...BtnStyle,
              background: isEditMode ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
              color: isEditMode ? '#818cf8' : '#9ca3af',
              border: `1px solid ${isEditMode ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: isEditMode ? '0 0 16px rgba(99,102,241,0.2)' : 'none',
            }}>
              {isEditMode ? <><Check size={13} /> Done</> : <><Edit3 size={13} /> Edit Layout</>}
            </button>

            {/* Add Widget (only in edit mode) */}
            {isEditMode && (
              <button onClick={onAddWidget} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
              }}>
                <Plus size={13} /> Add Widget
              </button>
            )}

            {/* Auto Layout (only in edit mode) */}
            {isEditMode && (
              <button onClick={handleAutoLayout} title="Auto-arrange widgets" style={{
                ...BtnStyle,
                background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)', color: '#22d3ee',
              }}>
                <Wand2 size={13} /> Auto Layout
              </button>
            )}
          </>
        )}

        {/* ── Spacer ───── */}
        <div style={{ flex: 1 }} />

        {/* ── Export ───── */}
        {activeDashboard && (
          <button onClick={handleExport} title="Export as PDF/Print" style={{
            ...BtnStyle,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#34d399',
          }}>
            <Download size={13} /> Export
          </button>
        )}

        {/* ── Refresh Controls ───── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '10px', color: '#4b5563' }}>
              {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button onClick={refreshData} title="Refresh now" style={{ ...BtnStyle, padding: '7px 9px' }}>
            <RefreshCw size={12} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowRefresh(o => !o)} style={{ ...BtnStyle, gap: '4px', padding: '6px 9px', fontSize: '11px' }}>
              <Clock size={11} /> {REFRESH_LABELS[refreshInterval]}
            </button>
            {showRefresh && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
                background: '#13141f', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '4px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              }} onMouseLeave={() => setShowRefresh(false)}>
                {(Object.keys(REFRESH_LABELS) as RefreshInterval[]).map(k => (
                  <button key={k} onClick={() => { setRefreshInterval(k); setShowRefresh(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    width: '100%', padding: '8px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    background: k === refreshInterval ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: k === refreshInterval ? '#818cf8' : '#d1d5db',
                    fontSize: '12px', fontFamily: 'inherit', textAlign: 'left', whiteSpace: 'nowrap',
                    transition: 'background 0.1s',
                  }}>
                    {k === refreshInterval && <Check size={11} />}
                    {REFRESH_LABELS[k] === 'Off' ? 'Manual only' : `Every ${REFRESH_LABELS[k]}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Gallery Modal */}
      {showTemplates && (
        <TemplateGallery onClose={() => setShowTemplates(false)} />
      )}
    </>
  );
};
