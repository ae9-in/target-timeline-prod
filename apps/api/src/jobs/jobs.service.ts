import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { calculateRagStatus } from '../targets/rag.util';
import { generatePdfReport } from '../reports/pdf-generator';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private reportsDir: string;
  private intervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const isVercel = !!process.env.VERCEL;
    this.reportsDir = isVercel
      ? '/tmp/reports'
      : path.join(process.cwd(), 'reports');
    try {
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }
    } catch (err) {
      this.logger.error(
        `Could not create reports directory: ${this.reportsDir}`,
        err,
      );
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing in-memory background jobs...');

    // 1. Schedule Nightly Snapshots (every 24 hours)
    const snapshotInterval = setInterval(
      () => {
        this.logger.log('Running scheduled Nightly Snapshots...');
        this.runNightlySnapshots().catch((err) =>
          this.logger.error('Error running snapshots', err),
        );
      },
      24 * 60 * 60 * 1000,
    );
    this.intervals.push(snapshotInterval);

    // 2. Schedule Hourly Alert Evaluations (every 1 hour)
    const alertInterval = setInterval(
      () => {
        this.logger.log('Running scheduled Hourly Alert Evaluations...');
        this.runAlertEvaluation().catch((err) =>
          this.logger.error('Error running alert evaluations', err),
        );
      },
      60 * 60 * 1000,
    );
    this.intervals.push(alertInterval);

    // 3. Schedule Weekly Report Generations (every 7 days)
    const reportInterval = setInterval(
      () => {
        this.logger.log('Running scheduled Weekly Report Generation...');
        this.runWeeklyReport().catch((err) =>
          this.logger.error('Error running weekly report', err),
        );
      },
      7 * 24 * 60 * 60 * 1000,
    );
    this.intervals.push(reportInterval);

    this.logger.log('In-memory background jobs setup complete.');
  }

  async onModuleDestroy() {
    this.logger.log('Stopping background job intervals...');
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
  }

  // --- 1. Nightly Snapshots Logic ---
  async runNightlySnapshots() {
    const targets = await this.prisma.target.findMany();
    const now = new Date();

    for (const t of targets) {
      const status = calculateRagStatus(
        t.startDate,
        t.deadline,
        t.baseline,
        t.targetValue,
        t.currentValue,
        t.direction as 'up' | 'down',
        now,
      );

      await this.prisma.targetSnapshot.create({
        data: {
          targetId: t.id,
          currentValue: t.currentValue,
          ragStatus: status.ragStatus,
          capturedAt: now,
        },
      });
    }
    this.logger.log(
      `Nightly snapshots captured for ${targets.length} targets.`,
    );
  }

  // --- 2. Hourly Alert Evaluation Logic ---
  async runAlertEvaluation() {
    const targets = await this.prisma.target.findMany();
    const now = new Date();

    let alertsRaised = 0;
    let alertsResolved = 0;

    for (const t of targets) {
      const status = calculateRagStatus(
        t.startDate,
        t.deadline,
        t.baseline,
        t.targetValue,
        t.currentValue,
        t.direction as 'up' | 'down',
        now,
      );

      const activeAlert = await this.prisma.alert.findFirst({
        where: {
          targetId: t.id,
          resolvedAt: null,
        },
      });

      if (status.ragStatus === 'RED' || status.ragStatus === 'AMBER') {
        if (!activeAlert) {
          // Raise new alert
          await this.prisma.alert.create({
            data: {
              targetId: t.id,
              ragStatus: status.ragStatus,
              gapPoints: status.gap,
              raisedAt: now,
            },
          });
          alertsRaised++;
        } else {
          // Update active alert gap/status
          await this.prisma.alert.update({
            where: { id: activeAlert.id },
            data: {
              ragStatus: status.ragStatus,
              gapPoints: status.gap,
            },
          });
        }
      } else {
        // GREEN target: resolve alert if active
        if (activeAlert) {
          await this.prisma.alert.update({
            where: { id: activeAlert.id },
            data: {
              resolvedAt: now,
            },
          });
          alertsResolved++;
        }
      }
    }
    this.logger.log(
      `Alert evaluation completed. Raised: ${alertsRaised}, Resolved: ${alertsResolved}`,
    );
  }

  // --- 3. Weekly Report Generation Logic ---
  async runWeeklyReport(): Promise<any> {
    const targets = await this.prisma.target.findMany();
    const departments = await this.prisma.department.findMany();
    const now = new Date();

    const counts = { GREEN: 0, AMBER: 0, RED: 0 };
    const verticalBreakdown: Record<string, typeof counts> = {};

    // Initialize with all DB departments
    for (const dept of departments) {
      verticalBreakdown[dept.name] = { GREEN: 0, AMBER: 0, RED: 0 };
    }

    const targetList: any[] = [];

    for (const t of targets) {
      const status = calculateRagStatus(
        t.startDate,
        t.deadline,
        t.baseline,
        t.targetValue,
        t.currentValue,
        t.direction as 'up' | 'down',
        now,
      );

      counts[status.ragStatus]++;

      if (!verticalBreakdown[t.vertical]) {
        verticalBreakdown[t.vertical] = { GREEN: 0, AMBER: 0, RED: 0 };
      }
      verticalBreakdown[t.vertical][status.ragStatus]++;

      targetList.push({
        name: t.name,
        vertical: t.vertical,
        owner: t.owner,
        currentValue: t.currentValue,
        targetValue: t.targetValue,
        unit: t.unit,
        ragStatus: status.ragStatus,
        progress: Math.round(status.actualProgress * 100),
      });
    }

    const reportId = `report_${now.getTime()}`;
    const pdfFileName = `${reportId}.pdf`;
    const pdfPath = path.join(this.reportsDir, pdfFileName);

    this.logger.log(
      `Generating PDF weekly report with pdfkit at ${pdfPath}...`,
    );

    try {
      await generatePdfReport(
        {
          generatedAt: now,
          counts,
          verticalBreakdown,
          targets: targetList,
        },
        pdfPath,
      );
      this.logger.log(`PDF Weekly Report successfully written to ${pdfPath}`);
    } catch (error) {
      this.logger.error('Failed to generate PDF report with pdfkit:', error);
      throw error;
    }

    // Save report metadata to database
    const savedReport = await this.prisma.weeklyReport.create({
      data: {
        id: reportId,
        generatedAt: now,
        pdfPath,
        summary: {
          ...counts,
          verticalBreakdown,
          targets: targetList,
        } as any,
      },
    });

    return savedReport;
  }
}
