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
}
