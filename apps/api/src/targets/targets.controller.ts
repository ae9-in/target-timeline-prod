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
} from '@nestjs/common';
import { Request } from 'express';
import { TargetsService } from './targets.service';
import { GanttService } from './gantt.service';
import { CreateTargetDto, UpdateTargetDto } from './dto/create-target.dto';
import { CreateDependencyDto, ScheduleUpdateDto, BaselineLabelDto } from './dto/gantt.dto';
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
    return this.ganttService.getGanttData(userVerticals, vertical, groupBy, locationId);
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
    @Req() req?: any,
  ) {
    const userVerticals = req.user.verticalScope || [];
    return this.targetsService.findAll(userVerticals, { vertical, owner, status, locationId });
  }

  @Get(':id')
  @RequirePermission('target', 'read')
  async findOne(@Param('id') id: string, @Req() req?: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.targetsService.findOne(id, userVerticals);
  }

  @Post()
  @RequirePermission('target', 'create')
  async create(@Body() createTargetDto: CreateTargetDto, @Req() req?: any, @Ip() ip?: string) {
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
    const roles = req.user.roles || [];
    return this.targetsService.update(id, updateTargetDto, userId, roles, ip || 'Unknown');
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
    const userVerticals = req.user.verticalScope || [];
    const roles = req.user.roles || [];
    return this.ganttService.scheduleUpdate(id, dto, userId, userVerticals, roles, ip || 'Unknown');
  }
}
