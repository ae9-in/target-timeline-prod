import { Controller, Get, Post, Param, UseGuards, Req, Ip, Res, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import * as fs from 'fs';

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
    const pdfPath = await this.reportsService.getPdfPath(id, userId, ip || 'Unknown');

    if (!fs.existsSync(pdfPath)) {
      throw new NotFoundException('PDF file not found on disk');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=weekly_report_${id}.pdf`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  }
}
