import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userVerticals: string[], status?: string) {
    const where: any = {};

    // Filter by open/resolved status
    if (status === 'open') {
      where.resolvedAt = null;
    } else if (status === 'resolved') {
      where.resolvedAt = { not: null };
    }

    // Enforce user verticalScope restrictions via target vertical
    if (userVerticals.length > 0) {
      where.target = {
        vertical: { in: userVerticals },
      };
    }

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        target: true,
      },
      orderBy: [
        { gapPoints: 'desc' }, // Severity first
        { raisedAt: 'desc' },
      ],
    });

    return alerts;
  }

  async acknowledge(id: string, userId: string, userName: string, ip: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { target: true },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updatedAlert = await this.prisma.alert.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: userName,
      },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'ACKNOWLEDGE_ALERT',
        resourceType: 'alert',
        resourceId: id,
        before: JSON.parse(JSON.stringify(alert)),
        after: JSON.parse(JSON.stringify(updatedAlert)),
        ip,
      },
    });

    return updatedAlert;
  }

  async resolve(id: string, userId: string, ip: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { target: true },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updatedAlert = await this.prisma.alert.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
      },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'RESOLVE_ALERT',
        resourceType: 'alert',
        resourceId: id,
        before: JSON.parse(JSON.stringify(alert)),
        after: JSON.parse(JSON.stringify(updatedAlert)),
        ip,
      },
    });

    return updatedAlert;
  }
}
