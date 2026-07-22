import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTargetDto, UpdateTargetDto } from './dto/create-target.dto';
import { calculateRagStatus } from './rag.util';

@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to calculate pace and RAG status on read
  enrichTarget(target: any) {
    const rag = calculateRagStatus(
      target.startDate,
      target.deadline,
      target.baseline,
      target.targetValue,
      target.currentValue,
      target.direction as 'up' | 'down',
    );
    return {
      ...target,
      expectedProgress: rag.expectedProgress,
      actualProgress: rag.actualProgress,
      gap: rag.gap,
      ragStatus: rag.ragStatus,
    };
  }

  async findAll(
    userVerticals: string[],
    filters: { vertical?: string; owner?: string; status?: string },
  ) {
    const where: any = {};

    // Enforce user verticalScope restrictions
    if (userVerticals.length > 0) {
      where.vertical = { in: userVerticals };
    }

    if (filters.vertical) {
      if (userVerticals.length > 0 && !userVerticals.includes(filters.vertical)) {
        return []; // Requested vertical is out of scope
      }
      where.vertical = filters.vertical;
    }

    if (filters.owner) {
      where.owner = filters.owner;
    }

    const targets = await this.prisma.target.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    let enriched = targets.map((t) => this.enrichTarget(t));

    if (filters.status) {
      const statusFilter = filters.status.toUpperCase();
      enriched = enriched.filter(
        (t) => t.ragStatus.toUpperCase() === statusFilter,
      );
    }

    return enriched;
  }

  async findOne(id: string, userVerticals: string[]) {
    const target = await this.prisma.target.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Verify scope access
    if (userVerticals.length > 0 && !userVerticals.includes(target.vertical)) {
      throw new ForbiddenException('Access to this target vertical is restricted');
    }

    return this.enrichTarget(target);
  }

  async create(dto: CreateTargetDto, userId: string, ip: string) {
    const target = await this.prisma.target.create({
      data: {
        name: dto.name,
        vertical: dto.vertical,
        owner: dto.owner,
        startDate: new Date(dto.startDate),
        deadline: new Date(dto.deadline),
        baseline: dto.baseline,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        unit: dto.unit,
        direction: dto.direction,
        isMilestone: dto.isMilestone ?? false,
        wbsParentId: dto.wbsParentId || null,
        progressPct: dto.progressPct ?? 0,
        createdBy: userId,
      },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'CREATE',
        resourceType: 'target',
        resourceId: target.id,
        after: JSON.parse(JSON.stringify(target)),
        ip,
      },
    });

    return this.enrichTarget(target);
  }

  async update(
    id: string,
    dto: UpdateTargetDto,
    userId: string,
    roles: string[],
    ip: string,
  ) {
    const targetBefore = await this.prisma.target.findUnique({
      where: { id },
    });

    if (!targetBefore) {
      throw new NotFoundException('Target not found');
    }

    // Enforce PLANNING_ANALYST restrictions
    const isPlannerOnly =
      roles.includes('PLANNING_ANALYST') &&
      !roles.includes('SUPER_ADMIN') &&
      !roles.includes('SALES_MANAGER') &&
      !roles.includes('PRODUCTION_MANAGER') &&
      !roles.includes('HR_MANAGER');

    if (isPlannerOnly) {
      // Timeline & deadlines are allowed, values are NOT
      if (
        dto.baseline !== undefined ||
        dto.targetValue !== undefined ||
        dto.currentValue !== undefined ||
        dto.direction !== undefined ||
        dto.vertical !== undefined
      ) {
        throw new ForbiddenException(
          'Permissions Restriction: Planning Analysts can only update timelines and deadlines, not target values, baselines, or directions.',
        );
      }
    }

    // Update target
    const targetAfter = await this.prisma.target.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.vertical && { vertical: dto.vertical }),
        ...(dto.owner && { owner: dto.owner }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.deadline && { deadline: new Date(dto.deadline) }),
        ...(dto.baseline !== undefined && { baseline: dto.baseline }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.currentValue !== undefined && { currentValue: dto.currentValue }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.direction && { direction: dto.direction }),
        ...(dto.isMilestone !== undefined && { isMilestone: dto.isMilestone }),
        ...(dto.wbsParentId !== undefined && { wbsParentId: dto.wbsParentId }),
        ...(dto.progressPct !== undefined && { progressPct: dto.progressPct }),
      },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'UPDATE',
        resourceType: 'target',
        resourceId: id,
        before: JSON.parse(JSON.stringify(targetBefore)),
        after: JSON.parse(JSON.stringify(targetAfter)),
        ip,
      },
    });

    return this.enrichTarget(targetAfter);
  }

  async remove(id: string, userId: string, ip: string) {
    const targetBefore = await this.prisma.target.findUnique({
      where: { id },
    });

    if (!targetBefore) {
      throw new NotFoundException('Target not found');
    }

    await this.prisma.target.delete({
      where: { id },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'DELETE',
        resourceType: 'target',
        resourceId: id,
        before: JSON.parse(JSON.stringify(targetBefore)),
        ip,
      },
    });

    return { success: true };
  }

  async getHistory(id: string, userVerticals: string[]) {
    const target = await this.prisma.target.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    if (userVerticals.length > 0 && !userVerticals.includes(target.vertical)) {
      throw new ForbiddenException('Access to target history restricted');
    }

    const history = await this.prisma.targetSnapshot.findMany({
      where: { targetId: id },
      orderBy: { capturedAt: 'asc' },
    });

    return history;
  }
}
