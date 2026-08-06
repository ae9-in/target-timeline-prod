import React, { useState } from 'react';
import { X, Search, PlusCircle } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from '../constants/widget-registry';
import type { WidgetType } from '../types/dashboard.types';

interface Props {
  onClose: () => void;
}

export const DashboardSidebar: React.FC<Props> = ({ onClose }) => {
  const { addWidget } = useDashboard();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered = WIDGET_REGISTRY.filter(w => {
    const matchesSearch = search ? w.label.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase()) : true;
    const matchesCat = activeCategory === 'All' || w.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...WIDGET_CATEGORIES];

  return (
    <div style={{
      width: '260px', flexShrink: 0, height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: '#0f1019',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
            <PlusCircle size={16} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Add Widgets</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search widgets..."
            style={{
              width: '100%', padding: '6px 8px 6px 24px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f3f4f6', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 10px', flexWrap: 'wrap', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '3px 8px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
            background: activeCategory === cat ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeCategory === cat ? '#818cf8' : '#6b7280',
            transition: 'all 0.15s',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Widget list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.map(entry => {
          const WidgetIcon = entry.icon;
          return (
            <button key={entry.type} onClick={() => addWidget(entry.type as WidgetType)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 10px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)'; }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <WidgetIcon size={16} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb' }}>{entry.label}</div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{entry.description}</div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', padding: '20px 0' }}>
            No widgets match your search
          </div>
        )}
      </div>
    </div>
  );
};
