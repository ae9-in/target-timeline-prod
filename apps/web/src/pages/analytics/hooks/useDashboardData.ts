import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { AnalyticsData } from '../types/dashboard.types';

const REFRESH_INTERVALS = {
  '30s': 30000,
  '1m': 60000,
  '5m': 300000,
  'off': 0,
};

export type RefreshInterval = keyof typeof REFRESH_INTERVALS;

export function useDashboardData(refreshInterval: RefreshInterval = '5m') {
  const [data, setData] = useState<AnalyticsData>({
    kpis: null,
    departmentBreakdown: [],
    leaderboard: [],
    deadlines: null,
    heatmap: [],
    insights: [],
    targets: [],
    loading: true,
    error: null,
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [kpis, departmentBreakdown, leaderboard, deadlines, heatmap, insights, targets] =
        await Promise.allSettled([
          dashboardService.fetchKPIs(),
          dashboardService.fetchDepartmentBreakdown(),
          dashboardService.fetchLeaderboard(),
          dashboardService.fetchDeadlines(),
          dashboardService.fetchHeatmap(),
          dashboardService.fetchInsights(),
          dashboardService.fetchTargets(),
        ]);

      setData({
        kpis: kpis.status === 'fulfilled' ? kpis.value : null,
        departmentBreakdown: departmentBreakdown.status === 'fulfilled' ? departmentBreakdown.value : [],
        leaderboard: leaderboard.status === 'fulfilled' ? leaderboard.value : [],
        deadlines: deadlines.status === 'fulfilled' ? deadlines.value : null,
        heatmap: heatmap.status === 'fulfilled' ? heatmap.value : [],
        insights: insights.status === 'fulfilled' ? insights.value : [],
        targets: targets.status === 'fulfilled' ? targets.value : [],
        loading: false,
        error: null,
      });
      setLastRefreshed(new Date());
    } catch (err) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load analytics data',
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const ms = REFRESH_INTERVALS[refreshInterval];
    if (ms > 0) {
      intervalRef.current = setInterval(fetchAll, ms);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchAll]);

  return { data, refresh: fetchAll, lastRefreshed, REFRESH_INTERVALS };
}
