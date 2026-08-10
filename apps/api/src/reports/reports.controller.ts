import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Ip,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import * as fs from 'fs';
import * as path from 'path';
import { generatePdfReport } from './pdf-generator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly/latest')
  @RequirePermission('report', 'read')
  async getLatest() {
    return this.reportsService.getLatest();
  }

  @Get('weekly')
  @RequirePermission('report', 'read')
  async getList() {
    return this.reportsService.getList();
  }

  @Post('weekly/generate')
  @RequirePermission('report', 'create')
  async generate(@Req() req: any, @Ip() ip: string) {
    const userId = req.user.sub;
    return this.reportsService.generate(userId, ip || 'Unknown');
  }

  @Get('weekly/:id/pdf')
  @RequirePermission('report', 'export')
  async getPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    const userId = req.user.sub;
    const report = await this.reportsService.getPdfPath(
      id,
      userId,
      ip || 'Unknown',
    );
    const pdfPath = report.pdfPath;

    if (!fs.existsSync(pdfPath)) {
      // Ensure directory exists (e.g. /tmp/reports on Vercel)
      const dir = path.dirname(pdfPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const summary = report.summary as any;
      if (
        summary &&
        (summary.GREEN !== undefined || summary.counts !== undefined)
      ) {
        const counts = summary.counts || {
          GREEN: summary.GREEN,
          AMBER: summary.AMBER,
          RED: summary.RED,
        };
        await generatePdfReport(
          {
            generatedAt: report.generatedAt,
            counts,
            verticalBreakdown: summary.verticalBreakdown || {},
            targets: summary.targets || [],
          },
          pdfPath,
        );
      } else {
        throw new NotFoundException(
          'PDF file not found and cannot be regenerated',
        );
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=weekly_report_${id}.pdf`,
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  }
}
