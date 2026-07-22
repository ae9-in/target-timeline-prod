import type { Task, ViewMode } from 'gantt-task-react';

export interface GanttTarget {
  id: string;
  name: string;
  vertical: string;
  owner: string;
  startDate: string;
  deadline: string;
  progressPct: number;
  isMilestone: boolean;
  wbsParentId?: string | null;
  ragStatus: string;
  dependencies: Array<{ predecessorId: string; type: string; lagDays: number }>;
  latestBaseline?: {
    baselineStart: string;
    baselineEnd: string;
    label: string;
  } | null;
  baseline?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  direction?: string;
}

export interface TransformOptions {
  groupBy: 'none' | 'vertical' | 'owner';
  criticalIds: Set<string>;
  showBaseline: boolean;
}

/**
 * Convert a date string or Date to a Date object at midnight (no timezone offset issues).
 */
function toDate(d: string | Date): Date {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Convert a single GanttTarget to a gantt-task-react Task.
 */
function targetToTask(
  t: GanttTarget,
  projectId?: string,
): Task {
  const start = toDate(t.startDate);
  const end = toDate(t.deadline);
  // gantt-task-react requires end > start — ensure at least 1 day
  if (end <= start) end.setDate(start.getDate() + 1);

  const progress = Math.min(100, Math.max(0, t.progressPct || 0));

  const task: Task = {
    id: t.id,
    name: t.name,
    start,
    end,
    progress,
    type: t.isMilestone ? 'milestone' : 'task',
    project: projectId,
    dependencies: t.dependencies
      .filter((d) => d.type === 'FS') // gantt-task-react only supports FS arrows natively
      .map((d) => d.predecessorId),
    styles: ragToStyles(t.ragStatus),
    isDisabled: false,
  };

  return task;
}

function ragToStyles(ragStatus: string) {
  switch (ragStatus?.toUpperCase()) {
    case 'GREEN':
      return { backgroundColor: '#10b981', backgroundSelectedColor: '#059669', progressColor: '#34d399', progressSelectedColor: '#6ee7b7' };
    case 'AMBER':
      return { backgroundColor: '#f59e0b', backgroundSelectedColor: '#d97706', progressColor: '#fcd34d', progressSelectedColor: '#fde68a' };
    case 'RED':
      return { backgroundColor: '#ef4444', backgroundSelectedColor: '#dc2626', progressColor: '#f87171', progressSelectedColor: '#fca5a5' };
    default:
      return { backgroundColor: '#6366f1', backgroundSelectedColor: '#4f46e5', progressColor: '#a5b4fc', progressSelectedColor: '#c7d2fe' };
  }
}

/**
 * Build baseline ghost tasks for the baseline overlay.
 * Rendered as semi-transparent tasks with a special ID suffix.
 */
export function buildGhostTasks(targets: GanttTarget[]): Task[] {
  const ghosts: Task[] = [];
  for (const t of targets) {
    if (!t.latestBaseline) continue;
    const start = toDate(t.latestBaseline.baselineStart);
    const end = toDate(t.latestBaseline.baselineEnd);
    if (end <= start) end.setDate(start.getDate() + 1);
    ghosts.push({
      id: `${t.id}__baseline`,
      name: `${t.name} (Baseline)`,
      start,
      end,
      progress: 0,
      type: 'task',
      isDisabled: true,
      styles: {
        backgroundColor: 'rgba(148, 163, 184, 0.25)',
        backgroundSelectedColor: 'rgba(148, 163, 184, 0.35)',
        progressColor: 'transparent',
        progressSelectedColor: 'transparent',
      },
    });
  }
  return ghosts;
}

/**
 * Main transform: converts raw targets into gantt-task-react Task[].
 * Applies groupBy transforms and interleaves baseline ghosts.
 */
export function toGanttTasks(
  targets: GanttTarget[],
  options: TransformOptions,
): Task[] {
  const { groupBy, criticalIds, showBaseline } = options;

  if (groupBy === 'none') {
    const tasks = targets.map((t) => {
      const task = targetToTask(t);
      if (criticalIds.has(t.id)) {
        task.styles = {
          ...task.styles,
          backgroundColor: task.styles?.backgroundColor,
          backgroundSelectedColor: task.styles?.backgroundSelectedColor,
        };
      }
      return task;
    });

    if (!showBaseline) return tasks;

    // Interleave baseline ghosts right after each task
    const result: Task[] = [];
    const ghostMap = new Map(buildGhostTasks(targets).map((g) => [g.id, g]));
    for (const t of tasks) {
      result.push(t);
      const ghost = ghostMap.get(`${t.id}__baseline`);
      if (ghost) result.push(ghost);
    }
    return result;
  }

  // Group by vertical or owner
  const groupKey = groupBy === 'vertical' ? 'vertical' : 'owner';
  const groups = new Map<string, GanttTarget[]>();

  for (const t of targets) {
    const key = (t as any)[groupKey] || 'Unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const result: Task[] = [];
  for (const [groupLabel, groupTargets] of groups) {
    const groupId = `group__${groupLabel}`;

    // Aggregate dates
    const allStarts = groupTargets.map((t) => toDate(t.startDate).getTime());
    const allEnds = groupTargets.map((t) => toDate(t.deadline).getTime());
    const groupStart = new Date(Math.min(...allStarts));
    const groupEnd = new Date(Math.max(...allEnds));
    if (groupEnd <= groupStart) groupEnd.setDate(groupStart.getDate() + 1);

    const avgProgress =
      groupTargets.reduce((sum, t) => sum + (t.progressPct || 0), 0) / groupTargets.length;

    // Parent (project-type) row
    result.push({
      id: groupId,
      name: groupLabel,
      start: groupStart,
      end: groupEnd,
      progress: Math.round(avgProgress),
      type: 'project',
      hideChildren: false,
      styles: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        backgroundSelectedColor: 'rgba(99, 102, 241, 0.35)',
        progressColor: 'rgba(99, 102, 241, 0.5)',
        progressSelectedColor: 'rgba(99, 102, 241, 0.6)',
      },
    });

    // Child tasks
    for (const t of groupTargets) {
      const task = targetToTask(t, groupId);
      result.push(task);
      if (showBaseline && t.latestBaseline) {
        const ghosts = buildGhostTasks([t]);
        if (ghosts.length > 0) result.push(ghosts[0]);
      }
    }
  }

  return result;
}

/**
 * Convert targets to CSV string for download.
 */
export function targetsToCSV(targets: GanttTarget[]): string {
  const headers = ['ID', 'Name', 'Vertical', 'Owner', 'Start', 'Deadline', 'Progress%', 'Milestone', 'RAG Status', 'Dependencies'];
  const rows = targets.map((t) => [
    t.id,
    `"${t.name}"`,
    t.vertical,
    `"${t.owner}"`,
    t.startDate.split('T')[0],
    t.deadline.split('T')[0],
    t.progressPct,
    t.isMilestone ? 'Yes' : 'No',
    t.ragStatus,
    t.dependencies.map((d) => `${d.type}:${d.predecessorId}`).join(';'),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export type { ViewMode };
