import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboards')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Dashboard CRUD ─────────────────────────────────────────────────────────

  @Get()
  findAll(@Req() req: any) {
    return this.dashboardService.findAllDashboards(req.user.sub);
  }

  @Get('templates')
  findTemplates() {
    return this.dashboardService.findAllTemplates();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.findOneDashboard(id, req.user.sub);
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.dashboardService.createDashboard(req.user.sub, body);
  }

  @Post('from-template/:templateId')
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { name?: string },
    @Req() req: any,
  ) {
    return this.dashboardService.createDashboardFromTemplate(templateId, req.user.sub, body.name);
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Body() body: { name?: string },
    @Req() req: any,
  ) {
    return this.dashboardService.cloneDashboard(id, req.user.sub, body.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.dashboardService.updateDashboard(id, req.user.sub, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.deleteDashboard(id, req.user.sub);
  }

  @Post(':id/star')
  toggleStar(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.toggleStar(req.user.sub, id);
  }

  // ─── Widget CRUD ────────────────────────────────────────────────────────────

  @Post(':id/widgets')
  addWidget(@Param('id') dashboardId: string, @Body() body: any, @Req() req: any) {
    return this.dashboardService.addWidget(dashboardId, req.user.sub, body);
  }

  @Patch(':id/widgets/layouts')
  updateLayouts(@Param('id') dashboardId: string, @Body() body: { layouts: any[] }, @Req() req: any) {
    return this.dashboardService.updateWidgetLayouts(dashboardId, req.user.sub, body.layouts);
  }

  @Patch(':id/widgets/:widgetId')
  updateWidget(
    @Param('widgetId') widgetId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.dashboardService.updateWidget(widgetId, req.user.sub, body);
  }

  @Post(':id/widgets/:widgetId/duplicate')
  duplicateWidget(@Param('widgetId') widgetId: string, @Req() req: any) {
    return this.dashboardService.duplicateWidget(widgetId, req.user.sub);
  }

  @Delete(':id/widgets/:widgetId')
  deleteWidget(@Param('widgetId') widgetId: string, @Req() req: any) {
    return this.dashboardService.deleteWidget(widgetId, req.user.sub);
  }

  // ─── Saved Filters ──────────────────────────────────────────────────────────

  @Get('saved-filters/list')
  getSavedFilters(@Req() req: any) {
    return this.dashboardService.findSavedFilters(req.user.sub);
  }

  @Post('saved-filters')
  createSavedFilter(@Body() body: { name: string; config: any }, @Req() req: any) {
    return this.dashboardService.createSavedFilter(req.user.sub, body.name, body.config);
  }

  @Delete('saved-filters/:id')
  deleteSavedFilter(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.deleteSavedFilter(id, req.user.sub);
  }
}
