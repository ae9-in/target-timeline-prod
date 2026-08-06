import React from 'react';
import { Brain, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import type { Insight } from '../types/dashboard.types';

interface Props { config: any; title: string; }

const INSIGHT_STYLES: Record<Insight['type'], { bg: string; border: string; icon: typeof AlertTriangle; color: string }> = {
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: AlertTriangle, color: '#f59e0b' },
  success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', icon: CheckCircle, color: '#10b981' },
  info: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', icon: Info, color: '#818cf8' },
};

export const AIInsightsWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { insights, loading } = analyticsData;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '5px', borderRadius: '7px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Brain size={14} style={{ color: '#818cf8' }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>AI-POWERED INSIGHTS</span>
        <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '9999px' }}>
          Rule-Based
        </div>
      </div>

      {/* Insights list */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '13px' }}>
            Generating insights...
          </div>
        ) : insights.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#6b7280' }}>
            <Brain size={28} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '13px' }}>No insights yet — add more targets</div>
          </div>
        ) : (
          insights.map((insight, idx) => {
            const style = INSIGHT_STYLES[insight.type];
            const Icon = style.icon;
            return (
              <div key={idx} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: style.bg, border: `1px solid ${style.border}`,
                display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <Icon size={14} style={{ color: style.color, marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb', marginBottom: '3px' }}>{insight.title}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>{insight.description}</div>
                  {insight.metric && (
                    <div style={{
                      marginTop: '6px', display: 'inline-flex', alignItems: 'center',
                      fontSize: '11px', fontWeight: 700, color: style.color,
                      background: style.bg, padding: '2px 8px', borderRadius: '9999px',
                      border: `1px solid ${style.border}`,
                    }}>
                      {insight.metric}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
