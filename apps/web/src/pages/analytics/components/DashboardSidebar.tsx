import React, { useState } from 'react';
import { X, Search, PlusCircle, BarChart3, Activity, Brain, Target } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from '../constants/widget-registry';
import type { WidgetType } from '../types/dashboard.types';

interface Props {
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  'KPI & Metrics': Target,
  'Charts': BarChart3,
  'Tables & Lists': Activity,
  'AI & Insights': Brain,
};

const CATEGORY_COLORS: Record<string, string> = {
  'KPI & Metrics': '#6366f1',
  'Charts': '#06b6d4',
  'Tables & Lists': '#10b981',
  'AI & Insights': '#f59e0b',
};

// Mini preview renders a tiny representative icon for each widget type
const WIDGET_PREVIEW_BG: Record<string, string> = {
  kpi_card: 'linear-gradient(135deg, #6366f120, #4f46e510)',
  rag_pie: 'conic-gradient(#10b981 0deg 130deg, #f59e0b 130deg 220deg, #ef4444 220deg 360deg)',
  completion_gauge: 'linear-gradient(135deg, #06b6d420, #0891b210)',
  bar_chart: 'linear-gradient(180deg, #6366f130 0%, #6366f110 100%)',
  line_chart: 'linear-gradient(135deg, #818cf820, #6366f110)',
  heatmap: 'linear-gradient(135deg, #10b98120, #059f6310)',
  area_chart: 'linear-gradient(180deg, #22d3ee20, #06b6d410)',
  donut_chart: 'conic-gradient(#6366f1 0deg 200deg, rgba(99,102,241,0.1) 200deg 360deg)',
  leaderboard: 'linear-gradient(135deg, #f59e0b20, #d9770010)',
  deadlines: 'linear-gradient(135deg, #ef444420, #dc262610)',
  activity_feed: 'linear-gradient(135deg, #10b98120, #059f6310)',
  drill_table: 'linear-gradient(135deg, #8b5cf620, #7c3aed10)',
  ai_insights: 'linear-gradient(135deg, #f59e0b20, #d9770010)',
  progress_card: 'linear-gradient(135deg, #06b6d420, #0891b210)',
  dept_progress: 'linear-gradient(135deg, #6366f120, #4f46e510)',
  // New widgets
  waterfall: 'linear-gradient(135deg, #10b98120, #059f6310)',
  scatter_plot: 'linear-gradient(135deg, #818cf820, #6366f110)',
  funnel: 'linear-gradient(180deg, #6366f130, #4f46e510)',
  speedometer: 'conic-gradient(#10b981 0deg 180deg, rgba(16,185,129,0.1) 180deg 360deg)',
  comparison_matrix: 'linear-gradient(135deg, #f59e0b20, #d9770010)',
  target_cards: 'linear-gradient(135deg, #06b6d420, #0891b210)',
  rich_text: 'linear-gradient(135deg, rgba(255,255,255,0.04), transparent)',
  timeline_snapshot: 'linear-gradient(135deg, #8b5cf620, #7c3aed10)',
};

export const DashboardSidebar: React.FC<Props> = ({ onClose }) => {
  const { addWidget } = useDashboard();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered = WIDGET_REGISTRY.filter(w => {
    const matchesSearch = search
      ? w.label.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesCat = activeCategory === 'All' || w.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...WIDGET_CATEGORIES];

  return (
    <div style={{
      width: '276px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #13141f 0%, #0f1019 100%)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '16px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      maxHeight: 'calc(100vh - 140px)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(99,102,241,0.05), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PlusCircle size={15} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>Add Widget</div>
              <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '1px' }}>{WIDGET_REGISTRY.length} available</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '7px', cursor: 'pointer', color: '#6b7280',
            padding: '6px', display: 'flex', transition: 'all 0.15s',
          }}>
            <X size={13} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search widgets..."
            style={{
              width: '100%', padding: '7px 9px 7px 26px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f3f4f6', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: '5px', padding: '10px 12px',
        flexWrap: 'wrap', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {categories.map(cat => {
          const CatIcon = cat !== 'All' ? CATEGORY_ICONS[cat] : null;
          const catColor = cat !== 'All' ? CATEGORY_COLORS[cat] : '#818cf8';
          const isActive = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '4px 10px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
              fontSize: '10px', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '4px',
              background: isActive ? `${catColor}20` : 'rgba(255,255,255,0.03)',
              color: isActive ? catColor : '#4b5563',
              boxShadow: isActive ? `0 0 0 1px ${catColor}30` : 'none',
            }}>
              {CatIcon && <CatIcon size={9} />}
              {cat === 'KPI & Metrics' ? 'KPIs' : cat === 'Tables & Lists' ? 'Tables' : cat === 'AI & Insights' ? 'AI' : cat}
            </button>
          );
        })}
      </div>

      {/* Widget list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {filtered.map(entry => {
          const WidgetIcon = entry.icon;
          const catColor = CATEGORY_COLORS[entry.category] || '#818cf8';
          const previewBg = WIDGET_PREVIEW_BG[entry.type] || 'rgba(99,102,241,0.1)';

          return (
            <button key={entry.type} onClick={() => addWidget(entry.type as WidgetType)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 10px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${catColor}08`;
                (e.currentTarget as HTMLElement).style.borderColor = `${catColor}25`;
                (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.transform = 'none';
              }}
            >
              {/* Mini preview */}
              <div style={{
                width: '40px', height: '36px', borderRadius: '7px',
                background: previewBg,
                border: `1px solid ${catColor}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                <WidgetIcon size={16} style={{ color: catColor, opacity: 0.9 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.label}
                </div>
                <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px', lineHeight: 1.4 }}>
                  {entry.description}
                </div>
              </div>
              {/* Add indicator */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                background: `${catColor}15`, border: `1px solid ${catColor}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: catColor, fontSize: '14px', fontWeight: 700,
              }}>+</div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '12px', padding: '24px 0' }}>
            No widgets match your search
          </div>
        )}
      </div>
    </div>
  );
};
