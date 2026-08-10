import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermission('alert', 'read')
  async findAll(@Query('status') status?: string, @Req() req?: any) {
    const userVerticals = req.user.verticalScope || [];
    return this.alertsService.findAll(userVerticals, status);
  }

  @Patch(':id/acknowledge')
  @RequirePermission('alert', 'update')
  async acknowledge(
    @Param('id') id: string,
    @Req() req?: any,
    @Ip() ip?: string,
  ) {
    const userId = req.user.sub;
    const userName = req.user.name || req.user.email;
    return this.alertsService.acknowledge(
      id,
      userId,
      userName,
      ip || 'Unknown',
    );
  }

  @Patch(':id/resolve')
  @RequirePermission('alert', 'update')
  async resolve(@Param('id') id: string, @Req() req?: any, @Ip() ip?: string) {
    const userId = req.user.sub;
    return this.alertsService.resolve(id, userId, ip || 'Unknown');
  }
}
