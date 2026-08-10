import React, { useState } from 'react';
import { X, BarChart3, Zap } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { DASHBOARD_TEMPLATES } from '../constants/dashboard-templates';
import type { WidgetType } from '../types/dashboard.types';

interface Props {
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Leadership: '#6366f1',
  Operations: '#10b981',
  'HR & People': '#06b6d4',
};

const MINI_PREVIEW_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444',
];

export const TemplateGallery: React.FC<Props> = ({ onClose }) => {
  const { createDashboard, addWidget } = useDashboard();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(DASHBOARD_TEMPLATES.map(t => t.category)))];

  const filtered = activeCategory === 'All'
    ? DASHBOARD_TEMPLATES
    : DASHBOARD_TEMPLATES.filter(t => t.category === activeCategory);

  const handleApplyTemplate = async (template: typeof DASHBOARD_TEMPLATES[0]) => {
    setLoading(template.id);
    try {
      await createDashboard({
        name: template.name,
        description: template.description,
        color: template.color,
      });

      // Add widgets sequentially to maintain order
      for (const w of template.widgets) {
        await addWidget(w.type as WidgetType);
      }

      onClose();
    } catch (err) {
      console.error('Failed to apply template', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '900px', maxWidth: '95vw', maxHeight: '88vh',
        background: 'linear-gradient(180deg, #13141f 0%, #0f1019 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(180deg, rgba(99,102,241,0.05), transparent)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                }}>
                  <BarChart3 size={20} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f3f4f6' }}>Dashboard Templates</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>Start instantly with a pre-built dashboard</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', cursor: 'pointer', color: '#6b7280',
              padding: '8px', display: 'flex', alignItems: 'center',
              transition: 'all 0.15s',
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '5px 12px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                background: activeCategory === cat ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                color: activeCategory === cat ? '#818cf8' : '#6b7280',
                boxShadow: activeCategory === cat ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
              }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {filtered.map(template => {
            const isLoading = loading === template.id;
            const catColor = CATEGORY_COLORS[template.category] || '#6366f1';

            return (
              <div key={template.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${catColor}40`;
                  (e.currentTarget as HTMLElement).style.background = `rgba(${catColor.slice(1).match(/../g)!.map(h => parseInt(h, 16)).join(',')},0.05)`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${catColor}25`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Mini Preview Canvas */}
                <div style={{
                  height: '140px', position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(135deg, ${catColor}08, ${catColor}04)`,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {/* Decorative mini widget blocks */}
                  <div style={{ position: 'absolute', inset: '12px', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '4px' }}>
                    {template.widgets.slice(0, 6).map((w, i) => (
                      <div key={i} style={{
                        gridColumn: `span ${Math.min(w.layout.w, 6)}`,
                        gridRow: `span ${Math.min(w.layout.h, 3)}`,
                        borderRadius: '5px',
                        background: `linear-gradient(135deg, ${MINI_PREVIEW_COLORS[i % MINI_PREVIEW_COLORS.length]}20, ${MINI_PREVIEW_COLORS[i % MINI_PREVIEW_COLORS.length]}10)`,
                        border: `1px solid ${MINI_PREVIEW_COLORS[i % MINI_PREVIEW_COLORS.length]}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px',
                        opacity: 0.8,
                      }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: MINI_PREVIEW_COLORS[i % MINI_PREVIEW_COLORS.length], opacity: 0.7 }} />
                      </div>
                    ))}
                  </div>

                  {/* Emoji badge */}
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    fontSize: '28px', lineHeight: 1,
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
                  }}>
                    {template.emoji}
                  </div>

                  {/* Category pill */}
                  <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    fontSize: '10px', fontWeight: 700,
                    background: `${catColor}20`, color: catColor,
                    padding: '2px 8px', borderRadius: '9999px',
                    border: `1px solid ${catColor}30`,
                  }}>
                    {template.category}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>{template.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{template.description}</p>
                  </div>

                  {/* Widget count pills */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#4b5563', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '4px' }}>
                      {template.widgets.length} widgets
                    </span>
                  </div>

                  <button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={!!loading}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px',
                      background: isLoading
                        ? 'rgba(99,102,241,0.08)'
                        : `linear-gradient(135deg, ${catColor}22, ${catColor}10)`,
                      border: `1px solid ${catColor}30`,
                      color: catColor, cursor: loading ? 'wait' : 'pointer',
                      fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {isLoading ? (
                      <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Creating...</>
                    ) : (
                      <><Zap size={13} /> Use Template</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
