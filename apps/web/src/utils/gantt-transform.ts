import type { Task, ViewMode } from 'gantt-task-react';

export interface GanttTarget {
  id: string;
  name: string;
  vertical: string;
  subDepartmentId?: string | null;
  subDepartment?: {
    id: string;
    name: string;
    departmentId: string;
  } | null;
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

export interface ZoomLevelConfig {
  unit: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  columnMinWidthPx: number;
  alignment: 'none' | 'calendarYear' | 'calendarQuarter';
  defaultPeriodCount: number;
  periodCount?: number;
  periodLengthMonths?: number;
  customStart?: Date | null;
  customEnd?: Date | null;
  fullRange?: { start: Date; end: Date } | null;
}

export interface ColumnInfo {
  label: string;
  topLabel: string;
  bottomLabel: string;
  start: Date;
  end: Date;
  xPx: number;
  widthPx: number;
}

export function computeDateScale(
  config: ZoomLevelConfig,
  viewportStart: Date,
  canvasWidthPx: number,
): {
  rangeStart: Date;
  rangeEnd: Date;
  resolvedUnit: 'day' | 'week' | 'month' | 'quarter' | 'year';
  columns: ColumnInfo[];
} {
  let rangeStart: Date;
  let rangeEnd: Date;
  let unit: 'day' | 'week' | 'month' | 'quarter' | 'year';

  if (config.unit === 'custom') {
    const customStart = config.customStart || new Date();
    const customEnd = config.customEnd || new Date(customStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    rangeStart = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate());
    rangeEnd = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate());

    const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 42) {
      unit = 'day';
    } else if (diffDays <= 180) {
      unit = 'week';
    } else if (diffDays <= 547) {
      unit = 'month';
    } else if (diffDays <= 1095) {
      unit = 'quarter';
    } else {
      unit = 'year';
    }
  } else {
    unit = config.unit as 'day' | 'week' | 'month' | 'quarter' | 'year';

    // Determine bounds from fullRange if provided, or default from viewportStart
    const startTarget = config.fullRange?.start || viewportStart;
    const endTarget = config.fullRange?.end || new Date(startTarget.getTime() + (config.defaultPeriodCount * 7 * 24 * 60 * 60 * 1000));

    if (unit === 'day') {
      rangeStart = new Date(startTarget.getFullYear(), startTarget.getMonth(), startTarget.getDate());
      rangeEnd = new Date(endTarget.getFullYear(), endTarget.getMonth(), endTarget.getDate() + 1);
    } else if (unit === 'week') {
      const day = startTarget.getDay();
      rangeStart = new Date(startTarget.getFullYear(), startTarget.getMonth(), startTarget.getDate() - day);
      const endDay = endTarget.getDay();
      rangeEnd = new Date(endTarget.getFullYear(), endTarget.getMonth(), endTarget.getDate() + (7 - endDay));
    } else if (unit === 'month') {
      rangeStart = new Date(startTarget.getFullYear(), startTarget.getMonth(), 1);
      rangeEnd = new Date(endTarget.getFullYear(), endTarget.getMonth() + 1, 1);
    } else if (unit === 'quarter') {
      const qLen = config.periodLengthMonths ?? 3;
      const startIdx = Math.floor(startTarget.getMonth() / qLen);
      rangeStart = new Date(startTarget.getFullYear(), startIdx * qLen, 1);
      const endIdx = Math.floor(endTarget.getMonth() / qLen);
      rangeEnd = new Date(endTarget.getFullYear(), (endIdx + 1) * qLen, 1);
    } else {
      rangeStart = new Date(startTarget.getFullYear(), 0, 1);
      rangeEnd = new Date(endTarget.getFullYear() + 1, 0, 1);
    }
  }

  const colPeriods: { start: Date; end: Date }[] = [];
  let current = new Date(rangeStart);

  while (current < rangeEnd) {
    const colStart = new Date(current);
    let colEnd: Date;

    if (unit === 'day') {
      colEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    } else if (unit === 'week') {
      colEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
    } else if (unit === 'month') {
      colEnd = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    } else if (unit === 'quarter') {
      const qLen = config.periodLengthMonths ?? 3;
      colEnd = new Date(current.getFullYear(), current.getMonth() + qLen, 1);
    } else {
      colEnd = new Date(current.getFullYear() + 1, 0, 1);
    }

    if (colEnd.getTime() <= colStart.getTime()) {
      colEnd = new Date(colStart.getTime() + 24 * 60 * 60 * 1000);
    }

    if (config.unit === 'custom' && colEnd > rangeEnd) {
      colEnd = new Date(rangeEnd);
    }

    colPeriods.push({ start: colStart, end: colEnd });
    current = new Date(colEnd);
  }

  const colWidthPx = config.columnMinWidthPx;
  const minPeriodsToFillCanvas = Math.max(1, Math.ceil(canvasWidthPx / colWidthPx));

  while (colPeriods.length < minPeriodsToFillCanvas) {
    const colStart = new Date(current);
    let colEnd: Date;

    if (unit === 'day') {
      colEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    } else if (unit === 'week') {
      colEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
    } else if (unit === 'month') {
      colEnd = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    } else if (unit === 'quarter') {
      const qLen = config.periodLengthMonths ?? 3;
      colEnd = new Date(current.getFullYear(), current.getMonth() + qLen, 1);
    } else {
      colEnd = new Date(current.getFullYear() + 1, 0, 1);
    }

    if (colEnd.getTime() <= colStart.getTime()) {
      colEnd = new Date(colStart.getTime() + 24 * 60 * 60 * 1000);
    }

    colPeriods.push({ start: colStart, end: colEnd });
    current = new Date(colEnd);
    rangeEnd = new Date(colEnd);
  }

  const columns: ColumnInfo[] = colPeriods.map((period, index) => {
    const start = period.start;
    const end = period.end;
    const xPx = index * colWidthPx;

    let topLabel = '';
    let bottomLabel = '';

    if (unit === 'day') {
      topLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      bottomLabel = start.getDate().toString();
    } else if (unit === 'week') {
      topLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      bottomLabel = `W${weekNo}`;
    } else if (unit === 'month') {
      topLabel = start.getFullYear().toString();
      bottomLabel = start.toLocaleDateString('en-US', { month: 'short' });
    } else if (unit === 'quarter') {
      const qLen = config.periodLengthMonths ?? 3;
      topLabel = start.getFullYear().toString();
      const qNum = Math.floor(start.getMonth() / qLen) + 1;
      bottomLabel = `Q${qNum}`;
    } else {
      topLabel = '';
      bottomLabel = start.getFullYear().toString();
    }

    return {
      label: bottomLabel,
      topLabel,
      bottomLabel,
      start,
      end,
      xPx,
      widthPx: colWidthPx,
    };
  });

  return {
    rangeStart,
    rangeEnd,
    resolvedUnit: unit,
    columns,
  };
}

export type { ViewMode };
