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
}
