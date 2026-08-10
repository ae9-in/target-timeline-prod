import React, { useState, useRef, useEffect } from 'react';
import { DashboardProvider } from './contexts/DashboardContext';
import { DashboardBuilder } from './components/DashboardBuilder';
import { DashboardGrid } from './components/DashboardGrid';
import { DashboardSidebar } from './components/DashboardSidebar';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { useDashboard } from './contexts/DashboardContext';
import { Analytics } from '../Analytics';
import { BarChart3, LayoutDashboard, Info, Grid3X3, Zap } from 'lucide-react';

// ─── Inner builder shell (needs context) ──────────────────────────────────────
const DashboardBuilderShell: React.FC = () => {
  const { isEditMode } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - (sidebarOpen ? 288 : 0));
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [sidebarOpen]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth - (sidebarOpen ? 288 : 0));
    }
  }, [sidebarOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
      {/* Builder Toolbar */}
      <DashboardBuilder onAddWidget={() => setSidebarOpen(true)} />

      {/* Global Filter Bar */}
      <GlobalFilterBar />

      {/* Edit mode hint */}
      {isEditMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 16px', borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
          border: '1px solid rgba(99,102,241,0.2)',
          fontSize: '12px', color: '#a5b4fc',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Info size={13} style={{ color: '#818cf8' }} />
          </div>
          <span><strong style={{ color: '#c7d2fe' }}>Edit Mode Active:</strong> Drag widgets by the grip handle to reorder · Resize from the corner · Click ⋮ for configure, duplicate, or delete</span>
        </div>
      )}

      {/* Canvas dot-grid background in edit mode */}
      {isEditMode && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          animation: 'fadeIn 0.4s ease',
        }} />
      )}

      {/* Main content area */}
      <div ref={containerRef} style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0, position: 'relative', zIndex: 1 }}>
        {/* Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DashboardGrid containerWidth={containerWidth} />
        </div>

        {/* Widget Picker Sidebar */}
        {sidebarOpen && (
          <div style={{ height: 'fit-content', position: 'sticky', top: '70px', flexShrink: 0 }}>
            <DashboardSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page (wraps with provider) ──────────────────────────────────────────
export const AnalyticsDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'builder'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3, desc: 'Location & Drill-Down Analytics', color: '#06b6d4' },
    { id: 'builder' as const, label: 'Dashboard Builder', icon: LayoutDashboard, desc: 'Enterprise BI Platform', color: '#818cf8' },
  ];

  return (
    <div className="content-container" style={{ gap: '14px' }}>
      {/* Premium Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,16,25,0.95) 0%, rgba(18,19,30,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: '-30px', right: '60px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-20px', right: '160px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
            flexShrink: 0,
          }}>
            <Grid3X3 size={22} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f3f4f6', margin: 0, letterSpacing: '-0.3px' }}>
              Business Intelligence Platform
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0', fontWeight: 400 }}>
              Build, customize, and share live analytics dashboards · Powered by real-time target data
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={12} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '9999px', border: '1px solid rgba(245,158,11,0.2)' }}>
              LIVE DATA
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '10px', padding: '4px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                background: isActive
                  ? `linear-gradient(135deg, ${tab.color}20, ${tab.color}10)`
                  : 'transparent',
                color: isActive ? tab.color : '#6b7280',
                boxShadow: isActive ? `inset 0 0 0 1px ${tab.color}30, 0 0 20px ${tab.color}10` : 'none',
              }}>
                <Icon size={15} />
                <span>{tab.label}</span>
                {isActive && (
                  <span style={{
                    fontSize: '10px', background: `${tab.color}20`, color: tab.color,
                    padding: '1px 7px', borderRadius: '9999px', fontWeight: 600,
                    border: `1px solid ${tab.color}30`,
                  }}>
                    {tab.desc}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Analytics />
      )}

      {activeTab === 'builder' && (
        <DashboardProvider>
          <DashboardBuilderShell />
        </DashboardProvider>
      )}
    </div>
  );
};
