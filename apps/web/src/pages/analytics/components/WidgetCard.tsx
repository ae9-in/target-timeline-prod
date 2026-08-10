import React, { useState } from 'react';
import { MoreVertical, GripVertical, Lock, Unlock, Eye, EyeOff, Copy, Trash2, Pencil, Settings2 } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetConfigPanel } from './WidgetConfigPanel';
import type { DashboardWidget } from '../types/dashboard.types';

interface Props {
  widget: DashboardWidget;
}

export const WidgetCard: React.FC<Props> = ({ widget }) => {
  const { isEditMode, removeWidget, renameWidget, duplicateWidget, toggleWidgetLock, toggleWidgetHide } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(widget.title);
  const [configOpen, setConfigOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== widget.title) {
      renameWidget(widget.id, newTitle.trim());
    }
    setRenaming(false);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #13141f 0%, #0f1019 100%)',
          border: `1px solid ${isEditMode ? 'rgba(99,102,241,0.25)' : hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '14px',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: isEditMode
            ? '0 0 0 1px rgba(99,102,241,0.08), 0 4px 20px rgba(0,0,0,0.25), 0 0 20px rgba(99,102,241,0.04)'
            : hovered
              ? '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 4px 16px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        {/* Shimmer border in edit mode */}
        {isEditMode && !widget.isLocked && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none', zIndex: 0,
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.04), transparent)',
            animation: 'shimmer 3s ease-in-out infinite',
          }} />
        )}

        {/* Widget Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(255,255,255,0.015)',
          flexShrink: 0,
          position: 'relative', zIndex: 10,
        }}>
          {/* Drag handle */}
          {isEditMode && !widget.isLocked && (
            <div className="widget-drag-handle" style={{
              cursor: 'grab', color: '#4b5563', flexShrink: 0,
              display: 'flex', alignItems: 'center', padding: '2px',
              borderRadius: '4px', transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#9ca3af'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}
            >
              <GripVertical size={13} />
            </div>
          )}
          {widget.isLocked && isEditMode && (
            <Lock size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
          )}

          {/* Title */}
          {renaming ? (
            <input
              autoFocus value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '5px', padding: '3px 7px', color: '#f3f4f6', fontSize: '12px',
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          ) : (
            <span style={{
              flex: 1, fontSize: '11px', fontWeight: 700, color: '#d1d5db',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '0.02em',
            }}>
              {widget.title}
            </span>
          )}

          {/* Actions menu */}
          {isEditMode && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  background: menuOpen ? 'rgba(255,255,255,0.08)' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: menuOpen ? '#9ca3af' : '#4b5563',
                  padding: '3px', display: 'flex', alignItems: 'center',
                  borderRadius: '5px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => !menuOpen && ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                onMouseLeave={e => !menuOpen && ((e.currentTarget as HTMLElement).style.color = '#4b5563')}
              >
                <MoreVertical size={13} />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 200,
                  background: '#13141f', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '4px', minWidth: '170px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                }} onMouseLeave={() => setMenuOpen(false)}>
                  {[
                    { label: 'Configure', icon: Settings2, action: () => { setConfigOpen(true); setMenuOpen(false); }, accent: '#818cf8' },
                    { label: 'Rename', icon: Pencil, action: () => { setRenaming(true); setMenuOpen(false); } },
                    { label: widget.isLocked ? 'Unlock' : 'Lock', icon: widget.isLocked ? Unlock : Lock, action: () => { toggleWidgetLock(widget.id); setMenuOpen(false); } },
                    { label: widget.isHidden ? 'Show' : 'Hide', icon: widget.isHidden ? Eye : EyeOff, action: () => { toggleWidgetHide(widget.id); setMenuOpen(false); } },
                    { label: 'Duplicate', icon: Copy, action: () => { duplicateWidget(widget.id); setMenuOpen(false); } },
                    { label: 'Remove', icon: Trash2, action: () => { removeWidget(widget.id); setMenuOpen(false); }, danger: true },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                      padding: '8px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                      background: 'transparent', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600,
                      color: (item as any).danger ? '#f87171' : (item as any).accent || '#d1d5db',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = (item as any).danger ? 'rgba(239,68,68,0.1)' : (item as any).accent ? `${(item as any).accent}12` : 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <item.icon size={12} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Widget Content */}
        <div style={{ flex: 1, padding: '12px', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          <WidgetRenderer widget={widget} />
        </div>
      </div>

      {/* Config Panel */}
      {configOpen && (
        <WidgetConfigPanel widget={widget} onClose={() => setConfigOpen(false)} />
      )}
    </>
  );
};
