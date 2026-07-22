import { useState, useEffect, useCallback } from 'react';
import type { GanttTarget } from '../utils/gantt-transform';

interface UseGanttDataResult {
  targets: GanttTarget[];
  criticalIds: Set<string>;
  taskFloats: Map<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGanttData(
  api: any,
  vertical?: string,
): UseGanttDataResult {
  const [targets, setTargets] = useState<GanttTarget[]>([]);
  const [criticalIds, setCriticalIds] = useState<Set<string>>(new Set());
  const [taskFloats, setTaskFloats] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (vertical) params.vertical = vertical;

        const [ganttRes, cpRes] = await Promise.all([
          api.get('/targets/gantt', { params }),
          api.get('/targets/critical-path', { params }),
        ]);

        if (!cancelled) {
          setTargets(ganttRes.data);
          const cp = cpRes.data;
          setCriticalIds(new Set<string>(cp.criticalPath ?? []));
          const floatMap = new Map<string, number>();
          for (const tf of (cp.taskFloats ?? [])) {
            floatMap.set(tf.id, tf.float);
          }
          setTaskFloats(floatMap);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load Gantt data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [api, vertical, tick]);

  return { targets, criticalIds, taskFloats, loading, error, refresh };
}
