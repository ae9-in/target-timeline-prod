import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('department-performance')
  @RequirePermission('department_performance', 'read')
  async getDeptPerformance(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getDepartmentPerformance(userVerticals);
  }

  @Get('trends')
  @RequirePermission('analytics', 'read')
  async getTrends(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getTrends(userVerticals);
  }

  // ─── New Dashboard Analytics Endpoints ────────────────────────────────────

  @Get('kpis')
  @RequirePermission('analytics', 'read')
  async getKPIs(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getKPIs(userVerticals);
  }

  @Get('department-breakdown')
  @RequirePermission('analytics', 'read')
  async getDepartmentBreakdown(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getDepartmentBreakdown(userVerticals);
  }

  @Get('leaderboard')
  @RequirePermission('analytics', 'read')
  async getLeaderboard(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getLeaderboard(userVerticals);
  }

  @Get('deadlines')
  @RequirePermission('analytics', 'read')
  async getDeadlines(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getDeadlines(userVerticals);
  }

  @Get('heatmap')
  @RequirePermission('analytics', 'read')
  async getHeatmap(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getHeatmapData(userVerticals);
  }

  @Get('insights')
  @RequirePermission('analytics', 'read')
  async getInsights(@Req() req: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.analyticsService.getInsights(userVerticals);
  }
}
