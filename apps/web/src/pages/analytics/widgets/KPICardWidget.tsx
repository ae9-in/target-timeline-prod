import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle2, AlertTriangle, XCircle, Clock, Zap } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import type { WidgetConfig } from '../types/dashboard.types';

interface Props {
  config: WidgetConfig;
  title: string;
}

const METRIC_CONFIGS = {
  total: { label: 'Total Targets', color: '#6366f1', icon: Target, suffix: '' },
  completed: { label: 'Completed', color: '#10b981', icon: CheckCircle2, suffix: '' },
  onTrack: { label: 'On Track', color: '#10b981', icon: CheckCircle2, suffix: '' },
  atRisk: { label: 'At Risk', color: '#f59e0b', icon: AlertTriangle, suffix: '' },
  offTrack: { label: 'Off Track', color: '#ef4444', icon: XCircle, suffix: '' },
  overdue: { label: 'Overdue', color: '#ef4444', icon: Clock, suffix: '' },
  avgCompletionPct: { label: 'Avg Completion', color: '#06b6d4', icon: TrendingUp, suffix: '%' },
  successRate: { label: 'Success Rate', color: '#10b981', icon: Zap, suffix: '%' },
  upcomingDeadlines: { label: 'Due This Week', color: '#f59e0b', icon: Clock, suffix: '' },
};

export const KPICardWidget: React.FC<Props> = ({ config, title }) => {
  const { analyticsData } = useDashboard();
  const { kpis } = analyticsData;
  const metric = (config.metric || 'total') as keyof typeof METRIC_CONFIGS;
  const cfg = METRIC_CONFIGS[metric] || METRIC_CONFIGS.total;
  const Icon = cfg.icon;
  const value = kpis ? (kpis as any)[metric] ?? 0 : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px',
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} style={{ color: cfg.color }} />
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 600,
          color: cfg.color,
          background: `${cfg.color}12`,
          padding: '2px 8px', borderRadius: '9999px',
        }}>
          Live
        </div>
      </div>

      <div style={{ fontSize: '36px', fontWeight: 800, color: '#f3f4f6', lineHeight: 1, marginBottom: '6px' }}>
        {analyticsData.loading ? '—' : `${value}${cfg.suffix}`}
      </div>
      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>{cfg.label}</div>

      {/* Mini trend bar */}
      <div style={{ marginTop: '12px', height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, value)}%`,
          background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
          borderRadius: '9999px', transition: 'width 1s ease',
        }} />
      </div>
    </div>
  );
};
