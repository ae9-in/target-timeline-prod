/**
 * Critical Path Method (CPM) utility.
 * Pure function — no side effects, no DB calls.
 *
 * Dependencies use Finish-to-Start (FS) semantics for CPM by default.
 * SS/FF/SF lag is simplified as: effective predecessor finish = start + lag or finish + lag.
 */

export interface CpmTask {
  id: string;
  startDate: Date;
  deadline: Date;
  durationDays: number; // computed from startDate → deadline
}

export interface CpmDependency {
  predecessorId: string;
  successorId: string;
  type: string; // FS | SS | FF | SF
  lagDays: number;
}

export interface CpmResult {
  id: string;
  earlyStart: number; // in days from project start
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  float: number; // total float (lateStart - earlyStart)
  isCritical: boolean;
}

/**
 * Detect cycles in the dependency graph using DFS white/grey/black coloring.
 * Returns true if a cycle is detected (reject the dependency).
 */
export function hasCycle(
  deps: Array<{ predecessorId: string; successorId: string }>,
  allTaskIds: string[],
): boolean {
  // Build adjacency list: predecessor → successors
  const adj = new Map<string, string[]>();
  for (const id of allTaskIds) {
    adj.set(id, []);
  }
  for (const dep of deps) {
    if (!adj.has(dep.predecessorId)) adj.set(dep.predecessorId, []);
    adj.get(dep.predecessorId)!.push(dep.successorId);
  }

  // 0 = white (unvisited), 1 = grey (in-stack), 2 = black (done)
  const color = new Map<string, number>();
  for (const id of allTaskIds) color.set(id, 0);
  // Also ensure predecessor/successors from deps are covered
  for (const dep of deps) {
    if (!color.has(dep.predecessorId)) color.set(dep.predecessorId, 0);
    if (!color.has(dep.successorId)) color.set(dep.successorId, 0);
  }

  function dfs(node: string): boolean {
    color.set(node, 1); // grey — currently in DFS stack
    for (const neighbor of adj.get(node) || []) {
      if (!color.has(neighbor)) color.set(neighbor, 0);
      const c = color.get(neighbor)!;
      if (c === 1) return true; // back edge = cycle
      if (c === 0 && dfs(neighbor)) return true;
    }
    color.set(node, 2); // black — fully explored
    return false;
  }

  for (const id of color.keys()) {
    if (color.get(id) === 0) {
      if (dfs(id)) return true;
    }
  }
  return false;
}

/**
 * Compute topological order via Kahn's algorithm (BFS).
 * Assumes acyclic graph (call hasCycle first).
 */
function topoSort(taskIds: string[], deps: CpmDependency[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of taskIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const dep of deps) {
    if (!inDegree.has(dep.successorId)) inDegree.set(dep.successorId, 0);
    if (!adj.has(dep.predecessorId)) adj.set(dep.predecessorId, []);
    adj.get(dep.predecessorId)!.push(dep.successorId);
    inDegree.set(dep.successorId, (inDegree.get(dep.successorId) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighbor of adj.get(node) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  return sorted;
}

/**
 * Effective constraint from a dependency, given predecessor earlyFinish and earlyStart.
 * Returns the minimum earlyStart for the successor.
 */
function effectiveConstraint(
  dep: CpmDependency,
  predEarlyStart: number,
  predEarlyFinish: number,
  succDuration: number,
): number {
  const lag = dep.lagDays || 0;
  switch (dep.type) {
    case 'SS':
      return predEarlyStart + lag;
    case 'FF':
      return predEarlyFinish + lag - succDuration;
    case 'SF':
      return predEarlyStart + lag - succDuration; // unusual
    case 'FS':
    default:
      return predEarlyFinish + lag;
  }
}

/**
 * Run the full CPM algorithm: forward pass then backward pass.
 * Returns a CpmResult per task.
 */
export function computeCriticalPath(
  tasks: CpmTask[],
  deps: CpmDependency[],
): CpmResult[] {
  const taskMap = new Map<string, CpmTask>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const sorted = topoSort(
    tasks.map((t) => t.id),
    deps,
  );

  // Build successor/predecessor maps
  const successors = new Map<string, CpmDependency[]>();
  const predecessors = new Map<string, CpmDependency[]>();
  for (const t of tasks) {
    successors.set(t.id, []);
    predecessors.set(t.id, []);
  }
  for (const dep of deps) {
    if (successors.has(dep.predecessorId)) {
      successors.get(dep.predecessorId)!.push(dep);
    }
    if (predecessors.has(dep.successorId)) {
      predecessors.get(dep.successorId)!.push(dep);
    }
  }

  // Forward pass — earlyStart / earlyFinish
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const id of sorted) {
    const task = taskMap.get(id)!;
    const preds = predecessors.get(id) || [];
    let es = 0;
    for (const dep of preds) {
      const predES = earlyStart.get(dep.predecessorId) ?? 0;
      const predEF =
        earlyFinish.get(dep.predecessorId) ??
        taskMap.get(dep.predecessorId)?.durationDays ??
        0;
      const constraint = effectiveConstraint(
        dep,
        predES,
        predEF,
        task.durationDays,
      );
      es = Math.max(es, constraint);
    }
    earlyStart.set(id, Math.max(0, es));
    earlyFinish.set(id, earlyStart.get(id)! + task.durationDays);
  }

  // Project duration = max earlyFinish across all tasks
  const projectDuration = Math.max(...[...earlyFinish.values()]);

  // Backward pass — lateFinish / lateStart
  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();

  for (const id of [...sorted].reverse()) {
    const task = taskMap.get(id)!;
    const succs = successors.get(id) || [];
    if (succs.length === 0) {
      lateFinish.set(id, projectDuration);
    } else {
      let lf = Infinity;
      for (const dep of succs) {
        const succLS = lateStart.get(dep.successorId) ?? projectDuration;
        const succLF = lateFinish.get(dep.successorId) ?? projectDuration;
        const succTask = taskMap.get(dep.successorId);
        const lag = dep.lagDays || 0;
        let constraint: number;
        switch (dep.type) {
          case 'SS':
            constraint = succLS - lag;
            break;
          case 'FF':
            constraint = succLF - lag;
            break;
          case 'SF':
            constraint = succLS - lag + (succTask?.durationDays ?? 0);
            break;
          case 'FS':
          default:
            constraint = succLS - lag;
        }
        lf = Math.min(lf, constraint);
      }
      lateFinish.set(id, lf === Infinity ? projectDuration : lf);
    }
    lateStart.set(id, lateFinish.get(id)! - task.durationDays);
  }

  // Compute float and critical path flag
  return sorted.map((id) => {
    const es = earlyStart.get(id) ?? 0;
    const ef = earlyFinish.get(id) ?? 0;
    const ls = lateStart.get(id) ?? 0;
    const lf = lateFinish.get(id) ?? 0;
    const float = Math.round(ls - es);
    return {
      id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      float,
      isCritical: float <= 0,
    };
  });
}
