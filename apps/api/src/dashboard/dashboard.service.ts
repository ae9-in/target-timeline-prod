import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard CRUD ────────────────────────────────────────────────────────

  async findAllDashboards(userId: string) {
    const dashboards = await this.prisma.dashboard.findMany({
      where: {
        OR: [{ createdBy: userId }, { isShared: true }],
      },
      include: {
        widgets: { orderBy: { order: 'asc' } },
        preferences: { where: { userId } },
        _count: { select: { widgets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return dashboards.map((d) => ({
      ...d,
      isStarred: d.preferences?.[0]?.isStarred ?? false,
      lastViewedAt: d.preferences?.[0]?.lastViewedAt ?? null,
      widgetCount: d._count.widgets,
    }));
  }

  async findOneDashboard(id: string, userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: {
        id,
        OR: [{ createdBy: userId }, { isShared: true }],
      },
      include: {
        widgets: { orderBy: { order: 'asc' } },
        preferences: { where: { userId } },
      },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');

    // Update lastViewedAt
    await this.prisma.userDashboardPreference.upsert({
      where: { userId_dashboardId: { userId, dashboardId: id } },
      update: { lastViewedAt: new Date() },
      create: { userId, dashboardId: id, lastViewedAt: new Date() },
    });

    return dashboard;
  }

  async createDashboard(userId: string, data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
    isShared?: boolean;
  }) {
    // If this is set as default, clear other defaults for this user
    if (data.isDefault) {
      await this.prisma.dashboard.updateMany({
        where: { createdBy: userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.dashboard.create({
      data: {
        ...data,
        createdBy: userId,
      },
      include: { widgets: true },
    });
  }

  async updateDashboard(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
    isDefault: boolean;
    isShared: boolean;
  }>) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, createdBy: userId },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found or not owned by you');

    if (data.isDefault) {
      await this.prisma.dashboard.updateMany({
        where: { createdBy: userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.dashboard.update({ where: { id }, data });
  }

  async deleteDashboard(id: string, userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, createdBy: userId },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found or not owned by you');
    return this.prisma.dashboard.delete({ where: { id } });
  }

  async cloneDashboard(id: string, userId: string, newName?: string) {
    const source = await this.prisma.dashboard.findFirst({
      where: {
        id,
        OR: [{ createdBy: userId }, { isShared: true }],
      },
      include: { widgets: true },
    });
    if (!source) throw new NotFoundException('Dashboard not found');

    const clone = await this.prisma.dashboard.create({
      data: {
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        icon: source.icon,
        color: source.color,
        isDefault: false,
        isShared: false,
        createdBy: userId,
      },
    });

    // Clone widgets
    if (source.widgets.length > 0) {
      await this.prisma.dashboardWidget.createMany({
        data: source.widgets.map((w) => ({
          dashboardId: clone.id,
          type: w.type,
          title: w.title,
          config: w.config as any,
          layout: w.layout as any,
          isLocked: w.isLocked,
          isHidden: w.isHidden,
          order: w.order,
        })),
      });
    }

    return this.prisma.dashboard.findUnique({
      where: { id: clone.id },
      include: { widgets: true },
    });
  }

  // ─── Widget CRUD ───────────────────────────────────────────────────────────

  async addWidget(dashboardId: string, userId: string, data: {
    type: string;
    title: string;
    config: Record<string, any>;
    layout: { x: number; y: number; w: number; h: number };
  }) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, OR: [{ createdBy: userId }, { isShared: true }] },
      include: { _count: { select: { widgets: true } } },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');

    return this.prisma.dashboardWidget.create({
      data: {
        dashboardId,
        type: data.type,
        title: data.title,
        config: data.config,
        layout: data.layout,
        order: dashboard._count.widgets,
      },
    });
  }

  async updateWidget(widgetId: string, userId: string, data: Partial<{
    title: string;
    config: Record<string, any>;
    layout: { x: number; y: number; w: number; h: number };
    isLocked: boolean;
    isHidden: boolean;
  }>) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboard: { OR: [{ createdBy: userId }, { isShared: true }] } },
    });
    if (!widget) throw new NotFoundException('Widget not found');
    return this.prisma.dashboardWidget.update({ where: { id: widgetId }, data: data as any });
  }

  async updateWidgetLayouts(dashboardId: string, userId: string, layouts: Array<{
    id: string;
    layout: { x: number; y: number; w: number; h: number };
  }>) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, OR: [{ createdBy: userId }, { isShared: true }] },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');

    await Promise.all(
      layouts.map((item) =>
        this.prisma.dashboardWidget.update({
          where: { id: item.id },
          data: { layout: item.layout },
        })
      )
    );
    return { success: true };
  }

  async deleteWidget(widgetId: string, userId: string) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboard: { OR: [{ createdBy: userId }, { isShared: true }] } },
    });
    if (!widget) throw new NotFoundException('Widget not found');
    return this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
  }

  async duplicateWidget(widgetId: string, userId: string) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboard: { OR: [{ createdBy: userId }, { isShared: true }] } },
    });
    if (!widget) throw new NotFoundException('Widget not found');

    return this.prisma.dashboardWidget.create({
      data: {
        dashboardId: widget.dashboardId,
        type: widget.type,
        title: `${widget.title} (Copy)`,
        config: widget.config as any,
        layout: { ...(widget.layout as any), y: (widget.layout as any).y + (widget.layout as any).h },
        isLocked: false,
        isHidden: false,
        order: widget.order + 1,
      },
    });
  }

  // ─── Templates ─────────────────────────────────────────────────────────────

  async findAllTemplates() {
    return this.prisma.dashboardTemplate.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async createDashboardFromTemplate(templateId: string, userId: string, name?: string) {
    const template = await this.prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const config = template.config as any;
    const dashboard = await this.createDashboard(userId, {
      name: name || template.name,
      description: template.description || undefined,
      icon: config.icon,
      color: config.color,
    });

    if (config.widgets && Array.isArray(config.widgets)) {
      await this.prisma.dashboardWidget.createMany({
        data: config.widgets.map((w: any, i: number) => ({
          dashboardId: dashboard.id,
          type: w.type,
          title: w.title,
          config: w.config || {},
          layout: w.layout || { x: 0, y: i * 4, w: 6, h: 4 },
          order: i,
        })),
      });
    }

    return this.prisma.dashboard.findUnique({
      where: { id: dashboard.id },
      include: { widgets: true },
    });
  }

  // ─── Saved Filters ─────────────────────────────────────────────────────────

  async findSavedFilters(userId: string) {
    return this.prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSavedFilter(userId: string, name: string, config: Record<string, any>) {
    return this.prisma.savedFilter.create({
      data: { userId, name, config },
    });
  }

  async deleteSavedFilter(id: string, userId: string) {
    const filter = await this.prisma.savedFilter.findFirst({
      where: { id, userId },
    });
    if (!filter) throw new NotFoundException('Saved filter not found');
    return this.prisma.savedFilter.delete({ where: { id } });
  }

  // ─── User Preferences ──────────────────────────────────────────────────────

  async toggleStar(userId: string, dashboardId: string) {
    const pref = await this.prisma.userDashboardPreference.findUnique({
      where: { userId_dashboardId: { userId, dashboardId } },
    });
    const newStarred = !(pref?.isStarred ?? false);
    await this.prisma.userDashboardPreference.upsert({
      where: { userId_dashboardId: { userId, dashboardId } },
      update: { isStarred: newStarred },
      create: { userId, dashboardId, isStarred: newStarred },
    });
    return { isStarred: newStarred };
  }
}
