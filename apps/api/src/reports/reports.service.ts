import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async getLatest() {
    const report = await this.prisma.weeklyReport.findFirst({
      orderBy: { generatedAt: 'desc' },
    });
    if (!report) {
      throw new NotFoundException('No weekly reports generated yet');
    }
    return report;
  }

  async getList() {
    return this.prisma.weeklyReport.findMany({
      orderBy: { generatedAt: 'desc' },
    });
  }

  async generate(userId: string, ip: string) {
    const report = await this.jobsService.runWeeklyReport();

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'GENERATE_REPORT',
        resourceType: 'report',
        resourceId: report.id,
        after: JSON.parse(JSON.stringify(report)),
        ip,
      },
    });

    return report;
  }

  async getPdfPath(id: string, userId: string, ip: string) {
    const report = await this.prisma.weeklyReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Write Audit Log for export action
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'EXPORT_REPORT',
        resourceType: 'report',
        resourceId: id,
        ip,
      },
    });

    return report.pdfPath;
  }
}
