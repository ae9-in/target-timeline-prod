import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { calculateRagStatus } from '../targets/rag.util';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartmentPerformance(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({ where });

    // Group by vertical
    const departments: Record<string, {
      green: number;
      amber: number;
      red: number;
      total: number;
      avgGap: number;
    }> = {
      Sales: { green: 0, amber: 0, red: 0, total: 0, avgGap: 0 },
      Production: { green: 0, amber: 0, red: 0, total: 0, avgGap: 0 },
      Hiring: { green: 0, amber: 0, red: 0, total: 0, avgGap: 0 },
    };

    let totalGaps: Record<string, number> = { Sales: 0, Production: 0, Hiring: 0 };

    for (const t of targets) {
      const stats = calculateRagStatus(
        t.startDate,
        t.deadline,
        t.baseline,
        t.targetValue,
        t.currentValue,
        t.direction as 'up' | 'down',
      );

      const dept = t.vertical;
      if (departments[dept]) {
        departments[dept].total++;
        totalGaps[dept] += stats.gap;

        if (stats.ragStatus === 'GREEN') departments[dept].green++;
        else if (stats.ragStatus === 'AMBER') departments[dept].amber++;
        else if (stats.ragStatus === 'RED') departments[dept].red++;
      }
    }

    // Compute averages
    for (const dept of Object.keys(departments)) {
      if (departments[dept].total > 0) {
        departments[dept].avgGap = totalGaps[dept] / departments[dept].total;
      }
    }

    // Get historical snapshot trend lines
    const snapshots = await this.prisma.targetSnapshot.findMany({
      where: {
        target: where,
      },
      include: {
        target: true,
      },
      orderBy: { capturedAt: 'asc' },
    });

    // Group snapshots by date and vertical
    const historyMap: Record<string, Record<string, { total: number; currentValue: number }>> = {};

    for (const snap of snapshots) {
      const dateStr = snap.capturedAt.toISOString().split('T')[0];
      const dept = snap.target.vertical;

      if (!historyMap[dateStr]) {
        historyMap[dateStr] = {
          Sales: { total: 0, currentValue: 0 },
          Production: { total: 0, currentValue: 0 },
          Hiring: { total: 0, currentValue: 0 },
        };
      }

      if (historyMap[dateStr][dept]) {
        historyMap[dateStr][dept].total++;
        historyMap[dateStr][dept].currentValue += snap.currentValue;
      }
    }

    const historyArray = Object.entries(historyMap).map(([date, depts]) => ({
      date,
      Sales: depts.Sales.total > 0 ? depts.Sales.currentValue / depts.Sales.total : 0,
      Production: depts.Production.total > 0 ? depts.Production.currentValue / depts.Production.total : 0,
      Hiring: depts.Hiring.total > 0 ? depts.Hiring.currentValue / depts.Hiring.total : 0,
    }));

    return {
      departments,
      history: historyArray.slice(-30), // Last 30 dates
    };
  }

  async getTrends(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({ where });

    // Calculate current RAG breakdown
    const ragMix = { GREEN: 0, AMBER: 0, RED: 0 };
    let totalProgress = 0;
    let count = 0;

    for (const t of targets) {
      const stats = calculateRagStatus(
        t.startDate,
        t.deadline,
        t.baseline,
        t.targetValue,
        t.currentValue,
        t.direction as 'up' | 'down',
      );
      ragMix[stats.ragStatus]++;
      totalProgress += Math.max(0, Math.min(1, stats.actualProgress));
      count++;
    }

    // Get historical RAG counts over time from snapshots
    const snapshots = await this.prisma.targetSnapshot.findMany({
      where: {
        target: where,
      },
      orderBy: { capturedAt: 'asc' },
    });

    const historicalMixMap: Record<string, { GREEN: number; AMBER: number; RED: number }> = {};

    for (const snap of snapshots) {
      const dateStr = snap.capturedAt.toISOString().split('T')[0];
      if (!historicalMixMap[dateStr]) {
        historicalMixMap[dateStr] = { GREEN: 0, AMBER: 0, RED: 0 };
      }
      const status = snap.ragStatus as 'GREEN' | 'AMBER' | 'RED';
      if (historicalMixMap[dateStr][status] !== undefined) {
        historicalMixMap[dateStr][status]++;
      }
    }

    const historicalMix = Object.entries(historicalMixMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      currentMix: ragMix,
      completionRate: count > 0 ? totalProgress / count : 0,
      historicalMix: historicalMix.slice(-30), // Last 30 points
    };
  }

  // ─── NEW: Rich KPI Data ───────────────────────────────────────────────────

  async getKPIs(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({
      where,
      include: { subDepartment: true },
    });

    const now = new Date();
    let totalProgress = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let onTrackCount = 0;
    let atRiskCount = 0;
    let offTrackCount = 0;
    const delayDays: number[] = [];
    const completionTimes: number[] = [];

    for (const t of targets) {
      const stats = calculateRagStatus(
        t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue,
        t.direction as 'up' | 'down',
      );

      totalProgress += Math.max(0, Math.min(1, stats.actualProgress));

      if (stats.actualProgress >= 1) {
        completedCount++;
        const durationDays = Math.ceil(
          (t.deadline.getTime() - t.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        completionTimes.push(durationDays);
      }

      if (new Date(t.deadline) < now && stats.actualProgress < 1) {
        overdueCount++;
        const delay = Math.ceil((now.getTime() - t.deadline.getTime()) / (1000 * 60 * 60 * 24));
        delayDays.push(delay);
      }

      if (stats.ragStatus === 'GREEN') onTrackCount++;
      else if (stats.ragStatus === 'AMBER') atRiskCount++;
      else if (stats.ragStatus === 'RED') offTrackCount++;
    }

    const total = targets.length;
    const avgCompletionPct = total > 0 ? Math.round((totalProgress / total) * 100) : 0;
    const avgDelay = delayDays.length > 0 ? Math.round(delayDays.reduce((a, b) => a + b, 0) / delayDays.length) : 0;
    const avgCompletionTime = completionTimes.length > 0 
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) 
      : 0;
    const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Upcoming deadlines (next 7 days)
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingCount = targets.filter(t => {
      const dl = new Date(t.deadline);
      return dl >= now && dl <= next7Days;
    }).length;

    return {
      total,
      completed: completedCount,
      overdue: overdueCount,
      onTrack: onTrackCount,
      atRisk: atRiskCount,
      offTrack: offTrackCount,
      avgCompletionPct,
      avgDelay,
      avgCompletionTime,
      successRate,
      upcomingDeadlines: upcomingCount,
      completionVelocity: completedCount > 0 ? Math.round(completedCount / Math.max(1, Math.ceil((now.getTime() - Math.min(...targets.map(t => t.startDate.getTime()))) / (1000 * 60 * 60 * 24 * 30)))) : 0,
    };
  }

  // ─── NEW: Department Breakdown ────────────────────────────────────────────

  async getDepartmentBreakdown(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({ where });
    const deptMap: Record<string, { green: number; amber: number; red: number; total: number; avgProgress: number; totalProgress: number }> = {};

    for (const t of targets) {
      const stats = calculateRagStatus(
        t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue,
        t.direction as 'up' | 'down',
      );
      const dept = t.vertical || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { green: 0, amber: 0, red: 0, total: 0, avgProgress: 0, totalProgress: 0 };
      deptMap[dept].total++;
      deptMap[dept].totalProgress += Math.max(0, Math.min(100, stats.actualProgress * 100));
      if (stats.ragStatus === 'GREEN') deptMap[dept].green++;
      else if (stats.ragStatus === 'AMBER') deptMap[dept].amber++;
      else deptMap[dept].red++;
    }

    return Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      ...data,
      avgProgress: data.total > 0 ? Math.round(data.totalProgress / data.total) : 0,
    }));
  }

  // ─── NEW: Employee Leaderboard ────────────────────────────────────────────

  async getLeaderboard(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({ where });
    const ownerMap: Record<string, { green: number; amber: number; red: number; total: number; totalProgress: number; department: string }> = {};

    for (const t of targets) {
      const stats = calculateRagStatus(
        t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue,
        t.direction as 'up' | 'down',
      );
      const owner = t.owner || 'Unknown';
      if (!ownerMap[owner]) ownerMap[owner] = { green: 0, amber: 0, red: 0, total: 0, totalProgress: 0, department: t.vertical };
      ownerMap[owner].total++;
      ownerMap[owner].totalProgress += Math.max(0, Math.min(100, stats.actualProgress * 100));
      if (stats.ragStatus === 'GREEN') ownerMap[owner].green++;
      else if (stats.ragStatus === 'AMBER') ownerMap[owner].amber++;
      else ownerMap[owner].red++;
    }

    return Object.entries(ownerMap)
      .map(([owner, data]) => ({
        owner,
        ...data,
        score: data.total > 0 ? Math.round(data.totalProgress / data.total) : 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  // ─── NEW: Upcoming / Missed Deadlines ────────────────────────────────────

  async getDeadlines(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({ where, orderBy: { deadline: 'asc' } });
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming = targets
      .filter(t => new Date(t.deadline) >= now && new Date(t.deadline) <= next30Days)
      .slice(0, 20)
      .map(t => {
        const stats = calculateRagStatus(t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue, t.direction as 'up' | 'down');
        const daysLeft = Math.ceil((t.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { id: t.id, name: t.name, owner: t.owner, vertical: t.vertical, deadline: t.deadline, daysLeft, ragStatus: stats.ragStatus, progress: Math.round(stats.actualProgress * 100) };
      });

    const missed = targets
      .filter(t => new Date(t.deadline) < now)
      .slice(0, 20)
      .map(t => {
        const stats = calculateRagStatus(t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue, t.direction as 'up' | 'down');
        const daysOverdue = Math.ceil((now.getTime() - t.deadline.getTime()) / (1000 * 60 * 60 * 24));
        return { id: t.id, name: t.name, owner: t.owner, vertical: t.vertical, deadline: t.deadline, daysOverdue, ragStatus: stats.ragStatus, progress: Math.round(stats.actualProgress * 100) };
      });

    return { upcoming, missed };
  }

  // ─── NEW: Calendar Heatmap Data ───────────────────────────────────────────

  async getHeatmapData(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const snapshots = await this.prisma.targetSnapshot.findMany({
      where: { target: where },
      orderBy: { capturedAt: 'asc' },
    });

    const dayMap: Record<string, { updates: number; green: number; amber: number; red: number }> = {};
    for (const snap of snapshots) {
      const dateStr = snap.capturedAt.toISOString().split('T')[0];
      if (!dayMap[dateStr]) dayMap[dateStr] = { updates: 0, green: 0, amber: 0, red: 0 };
      dayMap[dateStr].updates++;
      const s = snap.ragStatus.toLowerCase() as 'green' | 'amber' | 'red';
      if (dayMap[dateStr][s] !== undefined) dayMap[dateStr][s]++;
    }

    return Object.entries(dayMap).map(([date, data]) => ({ date, ...data }));
  }

  // ─── NEW: AI-style Rule-Based Insights ────────────────────────────────────

  async getInsights(userVerticals: string[]) {
    const where: any = {};
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    const targets = await this.prisma.target.findMany({ where });
    const insights: Array<{ type: 'warning' | 'success' | 'info'; title: string; description: string; metric?: string }> = [];
    const now = new Date();

    // Department-level analysis
    const deptMap: Record<string, { green: number; total: number; overdue: number }> = {};
    for (const t of targets) {
      const stats = calculateRagStatus(t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue, t.direction as 'up' | 'down');
      const dept = t.vertical || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { green: 0, total: 0, overdue: 0 };
      deptMap[dept].total++;
      if (stats.ragStatus === 'GREEN') deptMap[dept].green++;
      if (new Date(t.deadline) < now && stats.actualProgress < 1) deptMap[dept].overdue++;
    }

    for (const [dept, data] of Object.entries(deptMap)) {
      const greenPct = data.total > 0 ? Math.round((data.green / data.total) * 100) : 0;
      const behindPct = 100 - greenPct;

      if (behindPct > 50) {
        insights.push({ type: 'warning', title: `${dept} Department At Risk`, description: `${dept} is ${behindPct}% behind schedule with only ${greenPct}% of targets on track.`, metric: `${behindPct}% behind` });
      } else if (greenPct >= 80) {
        insights.push({ type: 'success', title: `${dept} Exceeding Targets`, description: `${dept} has ${greenPct}% of targets on track — excellent performance!`, metric: `${greenPct}% on track` });
      }

      if (data.overdue > 2) {
        insights.push({ type: 'warning', title: `${data.overdue} Overdue Targets in ${dept}`, description: `${dept} has ${data.overdue} overdue targets that require immediate attention.`, metric: `${data.overdue} overdue` });
      }
    }

    // Global insights
    const total = targets.length;
    if (total === 0) return insights;

    const totalGreen = targets.filter(t => {
      const s = calculateRagStatus(t.startDate, t.deadline, t.baseline, t.targetValue, t.currentValue, t.direction as 'up' | 'down');
      return s.ragStatus === 'GREEN';
    }).length;

    const overallGreenPct = Math.round((totalGreen / total) * 100);
    insights.push({ type: 'info', title: 'Overall Health Score', description: `${overallGreenPct}% of all targets are currently on track across all departments.`, metric: `${overallGreenPct}%` });

    // Upcoming deadlines in next 7 days
    const next7 = targets.filter(t => {
      const dl = new Date(t.deadline);
      return dl >= now && dl <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length;
    if (next7 > 0) {
      insights.push({ type: 'info', title: 'Deadlines This Week', description: `${next7} target${next7 > 1 ? 's' : ''} are due within the next 7 days. Ensure teams are prepared.`, metric: `${next7} due soon` });
    }

    return insights.slice(0, 8); // Max 8 insights
  }
}
