import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { calculateRagStatus } from '../targets/rag.util';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private reportsDir: string;
  private intervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing in-memory background jobs...');

    // 1. Schedule Nightly Snapshots (every 24 hours)
    const snapshotInterval = setInterval(() => {
      this.logger.log('Running scheduled Nightly Snapshots...');
      this.runNightlySnapshots().catch(err => this.logger.error('Error running snapshots', err));
    }, 24 * 60 * 60 * 1000);
    this.intervals.push(snapshotInterval);

    // 2. Schedule Hourly Alert Evaluations (every 1 hour)
    const alertInterval = setInterval(() => {
      this.logger.log('Running scheduled Hourly Alert Evaluations...');
      this.runAlertEvaluation().catch(err => this.logger.error('Error running alert evaluations', err));
    }, 60 * 60 * 1000);
    this.intervals.push(alertInterval);

    // 3. Schedule Weekly Report Generations (every 7 days)
    const reportInterval = setInterval(() => {
      this.logger.log('Running scheduled Weekly Report Generation...');
      this.runWeeklyReport().catch(err => this.logger.error('Error running weekly report', err));
    }, 7 * 24 * 60 * 60 * 1000);
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
    this.logger.log(`Nightly snapshots captured for ${targets.length} targets.`);
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
    this.logger.log(`Alert evaluation completed. Raised: ${alertsRaised}, Resolved: ${alertsResolved}`);
  }

  // --- 3. Weekly Report Generation Logic ---
  async runWeeklyReport(): Promise<any> {
    const targets = await this.prisma.target.findMany();
    const now = new Date();

    const counts = { GREEN: 0, AMBER: 0, RED: 0 };
    const verticalBreakdown: Record<string, typeof counts> = {
      Sales: { GREEN: 0, AMBER: 0, RED: 0 },
      Production: { GREEN: 0, AMBER: 0, RED: 0 },
      Hiring: { GREEN: 0, AMBER: 0, RED: 0 },
    };

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
      if (verticalBreakdown[t.vertical]) {
        verticalBreakdown[t.vertical][status.ragStatus]++;
      }

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

    // Generate Beautiful HTML layout
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; padding: 40px; margin: 0; background-color: #f9fafb; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 26px; font-weight: bold; color: #111827; }
          .date { font-size: 14px; color: #6b7280; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 35px; }
          .stat-card { border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e5e7eb; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .stat-card.green { border-top: 4px solid #10b981; }
          .stat-card.amber { border-top: 4px solid #f59e0b; }
          .stat-card.red { border-top: 4px solid #ef4444; }
          .stat-value { font-size: 32px; font-weight: bold; margin: 10px 0 5px 0; }
          .stat-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6b7280; }
          .section-title { font-size: 18px; font-weight: bold; color: #374151; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; margin-bottom: 35px; }
          th { background-color: #f3f4f6; color: #374151; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          td { padding: 14px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .badge.GREEN { background-color: #d1fae5; color: #065f46; }
          .badge.AMBER { background-color: #fef3c7; color: #92400e; }
          .badge.RED { background-color: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Targets & Timelines — Leadership RAG Report</div>
          <div class="date">${now.toLocaleDateString()}</div>
        </div>

        <div class="section-title">Weekly Summary Statistics</div>
        <div class="stats-grid">
          <div class="stat-card green">
            <div class="stat-label">On Track</div>
            <div class="stat-value" style="color: #10b981;">${counts.GREEN}</div>
            <div class="stat-label">Targets</div>
          </div>
          <div class="stat-card amber">
            <div class="stat-label">At Risk</div>
            <div class="stat-value" style="color: #f59e0b;">${counts.AMBER}</div>
            <div class="stat-label">Targets</div>
          </div>
          <div class="stat-card red">
            <div class="stat-label">Off Track</div>
            <div class="stat-value" style="color: #ef4444;">${counts.RED}</div>
            <div class="stat-label">Targets</div>
          </div>
        </div>

        <div class="section-title">Department Performance Metrics</div>
        <table>
          <thead>
            <tr>
              <th>Vertical</th>
              <th style="color: #10b981;">Green</th>
              <th style="color: #f59e0b;">Amber</th>
              <th style="color: #ef4444;">Red</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(verticalBreakdown)
              .map(
                ([vertical, scores]) => `
              <tr>
                <td><strong>${vertical}</strong></td>
                <td>${scores.GREEN}</td>
                <td>${scores.AMBER}</td>
                <td>${scores.RED}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-title">Target Breakdown Detailed View</div>
        <table>
          <thead>
            <tr>
              <th>Target Name</th>
              <th>Vertical</th>
              <th>Owner</th>
              <th>Current Progress</th>
              <th>RAG Status</th>
            </tr>
          </thead>
          <tbody>
            ${targetList
              .map(
                (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.vertical}</td>
                <td>${item.owner}</td>
                <td>${item.currentValue} / ${item.targetValue} ${item.unit} (${item.progress}%)</td>
                <td><span class="badge ${item.ragStatus}">${item.ragStatus}</span></td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Launch Puppeteer to render PDF
    this.logger.log('Launching headless browser to render PDF weekly report...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent);

    const reportId = `report_${now.getTime()}`;
    const pdfFileName = `${reportId}.pdf`;
    const pdfPath = path.join(this.reportsDir, pdfFileName);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      printBackground: true,
    });

    await browser.close();
    this.logger.log(`PDF Weekly Report successfully written to ${pdfPath}`);

    // Save report metadata to database
    const savedReport = await this.prisma.weeklyReport.create({
      data: {
        id: reportId,
        generatedAt: now,
        pdfPath,
        summary: counts,
      },
    });

    return savedReport;
  }
}
