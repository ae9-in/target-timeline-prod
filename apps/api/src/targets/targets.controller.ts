import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { generatePdfReport } from '../reports/pdf-generator';
import { TargetsService } from './targets.service';
import { GanttService } from './gantt.service';
import { CreateTargetDto, UpdateTargetDto } from './dto/create-target.dto';
import {
  CreateDependencyDto,
  ScheduleUpdateDto,
  BaselineLabelDto,
} from './dto/gantt.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('targets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TargetsController {
  constructor(
    private readonly targetsService: TargetsService,
    private readonly ganttService: GanttService,
  ) {}

  // ─── Gantt-specific routes (must be defined BEFORE :id to avoid route conflicts) ───

  @Get('gantt')
  @RequirePermission('target', 'read')
  async getGanttData(
    @Query('vertical') vertical?: string,
    @Query('groupBy') groupBy?: string,
    @Query('locationId') locationId?: string,
    @Req() req?: any,
  ) {
    const userVerticals = req.user.verticalScope || [];
    return this.ganttService.getGanttData(
      userVerticals,
      vertical,
      groupBy,
      locationId,
    );
  }

  @Get('critical-path')
  @RequirePermission('target', 'read')
  async getCriticalPath(
    @Query('vertical') vertical?: string,
    @Req() req?: any,
  ) {
    const userVerticals = req.user.verticalScope || [];
    return this.ganttService.getCriticalPath(userVerticals, vertical);
  }

  @Delete('dependencies/:depId')
  @RequirePermission('target', 'update')
  @HttpCode(HttpStatus.OK)
  async deleteDependency(
    @Param('depId') depId: string,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    return this.ganttService.deleteDependency(depId, userId, ip || 'Unknown');
  }

  // ─── Standard CRUD ───

  @Get()
  @RequirePermission('target', 'read')
  async findAll(
    @Query('vertical') vertical?: string,
    @Query('owner') owner?: string,
    @Query('status') status?: string,
    @Query('locationId') locationId?: string,
    @Query('subDepartmentId') subDepartmentId?: string,
    @Req() req?: any,
  ) {
    const userVerticals = req.user.verticalScope || [];
    return this.targetsService.findAll(userVerticals, {
      vertical,
      owner,
      status,
      locationId,
      subDepartmentId,
    });
  }

  @Get('export/pdf')
  @RequirePermission('target', 'read')
  async exportPdf(
    @Query('vertical') vertical: string,
    @Query('owner') owner: string,
    @Query('status') status: string,
    @Query('locationId') locationId: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userVerticals = req.user.verticalScope || [];
    const targets = await this.targetsService.findAll(userVerticals, {
      vertical,
      owner,
      status,
      locationId,
    });

    const counts = targets.reduce(
      (acc, t) => {
        const s = t.ragStatus?.toUpperCase();
        if (s === 'GREEN') acc.GREEN++;
        else if (s === 'AMBER') acc.AMBER++;
        else if (s === 'RED') acc.RED++;
        return acc;
      },
      { GREEN: 0, AMBER: 0, RED: 0 },
    );

    const verticalBreakdown: Record<
      string,
      { GREEN: number; AMBER: number; RED: number }
    > = {};
    for (const t of targets) {
      const v = t.vertical || 'Unassigned';
      if (!verticalBreakdown[v]) {
        verticalBreakdown[v] = { GREEN: 0, AMBER: 0, RED: 0 };
      }
      const s = t.ragStatus?.toUpperCase();
      if (s === 'GREEN') verticalBreakdown[v].GREEN++;
      else if (s === 'AMBER') verticalBreakdown[v].AMBER++;
      else if (s === 'RED') verticalBreakdown[v].RED++;
    }

    const pdfTargets = targets.map((t) => ({
      name: t.name,
      vertical: t.vertical,
      owner: t.owner,
      currentValue: t.currentValue,
      targetValue: t.targetValue,
      unit: t.unit,
      ragStatus: t.ragStatus,
      progress: Math.round(t.actualProgress * 100),
    }));

    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempPath = path.join(tempDir, `export_${Date.now()}.pdf`);

    try {
      await generatePdfReport(
        {
          generatedAt: new Date(),
          counts,
          verticalBreakdown,
          targets: pdfTargets,
        },
        tempPath,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=targets_export.pdf',
      );

      const fileStream = fs.createReadStream(tempPath);
      fileStream.pipe(res);
      fileStream.on('end', () => {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      });
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw err;
    }
  }

  @Get(':id')
  @RequirePermission('target', 'read')
  async findOne(@Param('id') id: string, @Req() req?: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.targetsService.findOne(id, userVerticals);
  }

  @Post()
  @RequirePermission('target', 'create')
  async create(
    @Body() createTargetDto: CreateTargetDto,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    return this.targetsService.create(createTargetDto, userId, ip || 'Unknown');
  }

  @Put(':id')
  @Patch(':id')
  @RequirePermission('target', 'update')
  async update(
    @Param('id') id: string,
    @Body() updateTargetDto: UpdateTargetDto,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    const userName = req.user.name || 'Unknown';
    const roles = req.user.roles || [];
    return this.targetsService.update(
      id,
      updateTargetDto,
      userId,
      userName,
      roles,
      ip || 'Unknown',
    );
  }

  @Delete(':id')
  @RequirePermission('target', 'delete')
  async remove(@Param('id') id: string, @Req() req?: any, @Ip() ip?: string) {
    const userId = req.user.sub;
    return this.targetsService.remove(id, userId, ip || 'Unknown');
  }

  @Get(':id/history')
  @RequirePermission('target', 'read')
  async getHistory(@Param('id') id: string, @Req() req?: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.targetsService.getHistory(id, userVerticals);
  }

  @Get(':id/audit-log')
  @RequirePermission('target', 'read')
  async getTargetAuditLog(@Param('id') id: string, @Req() req?: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.targetsService.getAuditLog(id, userVerticals);
  }

  // ─── Gantt :id-scoped routes ───

  @Post(':id/dependencies')
  @RequirePermission('target', 'update')
  async addDependency(
    @Param('id') id: string,
    @Body() dto: CreateDependencyDto,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    return this.ganttService.addDependency(id, dto, userId, ip || 'Unknown');
  }

  @Post(':id/baseline')
  @RequirePermission('target', 'update')
  async snapshotBaseline(
    @Param('id') id: string,
    @Body() dto: BaselineLabelDto,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    return this.ganttService.snapshotBaseline(id, dto, userId, ip || 'Unknown');
  }

  @Get(':id/baseline/latest')
  @RequirePermission('target', 'read')
  async getLatestBaseline(@Param('id') id: string) {
    return this.ganttService.getLatestBaseline(id);
  }

  @Patch(':id/schedule')
  @RequirePermission('target', 'update')
  async scheduleUpdate(
    @Param('id') id: string,
    @Body() dto: ScheduleUpdateDto,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    const userName = req.user.name || 'Unknown';
    const userVerticals = req.user.verticalScope || [];
    const roles = req.user.roles || [];
    return this.ganttService.scheduleUpdate(
      id,
      dto,
      userId,
      userName,
      userVerticals,
      roles,
      ip || 'Unknown',
    );
  }
}
