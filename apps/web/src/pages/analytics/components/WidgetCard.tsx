import React, { useState } from 'react';
import { MoreVertical, GripVertical, Lock, Unlock, Eye, EyeOff, Copy, Trash2, Pencil, X } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { WidgetRenderer } from './WidgetRenderer';
import type { DashboardWidget } from '../types/dashboard.types';

interface Props {
  widget: DashboardWidget;
}

export const WidgetCard: React.FC<Props> = ({ widget }) => {
  const { isEditMode, removeWidget, renameWidget, duplicateWidget, toggleWidgetLock, toggleWidgetHide } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(widget.title);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== widget.title) {
      renameWidget(widget.id, newTitle.trim());
    }
    setRenaming(false);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#12131e',
      border: `1px solid ${isEditMode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isEditMode ? '0 0 0 1px rgba(99,102,241,0.1), 0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      {/* Widget Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.01)',
        flexShrink: 0,
      }}>
        {/* Drag handle — only visible in edit mode */}
        {isEditMode && !widget.isLocked && (
          <div className="widget-drag-handle" style={{ cursor: 'grab', color: '#6b7280', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <GripVertical size={14} />
          </div>
        )}
        {widget.isLocked && isEditMode && (
          <Lock size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
        )}

        {/* Title */}
        {renaming ? (
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '4px', padding: '2px 6px', color: '#f3f4f6', fontSize: '12px',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {widget.title}
          </span>
        )}

        {/* Widget actions menu */}
        {isEditMode && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 50,
                background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '4px', minWidth: '160px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }} onMouseLeave={() => setMenuOpen(false)}>
                {[
                  { label: 'Rename', icon: Pencil, action: () => { setRenaming(true); setMenuOpen(false); } },
                  { label: widget.isLocked ? 'Unlock' : 'Lock', icon: widget.isLocked ? Unlock : Lock, action: () => { toggleWidgetLock(widget.id); setMenuOpen(false); } },
                  { label: widget.isHidden ? 'Show' : 'Hide', icon: widget.isHidden ? Eye : EyeOff, action: () => { toggleWidgetHide(widget.id); setMenuOpen(false); } },
                  { label: 'Duplicate', icon: Copy, action: () => { duplicateWidget(widget.id); setMenuOpen(false); } },
                  { label: 'Remove', icon: Trash2, action: () => { removeWidget(widget.id); setMenuOpen(false); }, danger: true },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: 'none', fontFamily: 'inherit', fontSize: '12px', fontWeight: 500,
                    color: (item as any).danger ? '#f87171' : '#e5e7eb',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = (item as any).danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
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
      <div style={{ flex: 1, padding: '12px', overflow: 'hidden', minHeight: 0 }}>
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  );
};
