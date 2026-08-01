import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
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
    filters: { vertical?: string; owner?: string; status?: string; locationId?: string },
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

    if (filters.locationId) {
      where.locationId = filters.locationId;
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
    if (new Date(dto.deadline) <= new Date(dto.startDate)) {
      throw new BadRequestException('Deadline must be after start date');
    }

    if (dto.direction === 'up' && dto.targetValue <= dto.baseline) {
      throw new BadRequestException('Target value must be greater than baseline value for upward targets');
    }
    if (dto.direction === 'down' && dto.targetValue >= dto.baseline) {
      throw new BadRequestException('Target value must be less than baseline value for downward targets');
    }

    const targetDiff = dto.direction === 'up' ? dto.targetValue - dto.baseline : dto.baseline - dto.targetValue;
    let actualProgress = 0;
    if (targetDiff !== 0) {
      if (dto.direction === 'up') {
        actualProgress = (dto.currentValue - dto.baseline) / targetDiff;
      } else {
        actualProgress = (dto.baseline - dto.currentValue) / targetDiff;
      }
    } else {
      actualProgress = dto.currentValue === dto.targetValue ? 1 : 0;
    }
    const progressPct = Math.min(100, Math.max(0, actualProgress * 100));

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
        progressPct: progressPct,
        locationId: dto.locationId || null,
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

    await this.evaluateAlertsForTarget(target.id);

    return this.enrichTarget(target);
  }

  async update(
    id: string,
    dto: UpdateTargetDto & { note?: string },
    userId: string,
    userName: string,
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

    const newStartDate = dto.startDate ? new Date(dto.startDate) : targetBefore.startDate;
    const newDeadline = dto.deadline ? new Date(dto.deadline) : targetBefore.deadline;
    if (newDeadline <= newStartDate) {
      throw new BadRequestException('Deadline must be after start date');
    }

    const newBaseline = dto.baseline !== undefined ? dto.baseline : targetBefore.baseline;
    const newTargetValue = dto.targetValue !== undefined ? dto.targetValue : targetBefore.targetValue;
    const newDirection = dto.direction ? dto.direction : targetBefore.direction;

    if (newDirection === 'up' && newTargetValue <= newBaseline) {
      throw new BadRequestException('Target value must be greater than baseline value for upward targets');
    }
    if (newDirection === 'down' && newTargetValue >= newBaseline) {
      throw new BadRequestException('Target value must be less than baseline value for downward targets');
    }

    const targetDiff = newDirection === 'up' ? newTargetValue - newBaseline : newBaseline - newTargetValue;
    
    let finalCurrentValue = dto.currentValue !== undefined ? dto.currentValue : targetBefore.currentValue;
    let finalProgressPct = dto.progressPct !== undefined ? dto.progressPct : targetBefore.progressPct;

    if (dto.progressPct !== undefined && dto.currentValue === undefined) {
      // Gantt/timeline update sent progressPct directly
      finalProgressPct = dto.progressPct;
      if (targetDiff !== 0) {
        if (newDirection === 'up') {
          finalCurrentValue = newBaseline + (dto.progressPct / 100) * targetDiff;
        } else {
          finalCurrentValue = newBaseline - (dto.progressPct / 100) * targetDiff;
        }
      } else {
        finalCurrentValue = dto.progressPct >= 100 ? newTargetValue : newBaseline;
      }
    } else if (dto.currentValue !== undefined || dto.baseline !== undefined || dto.targetValue !== undefined || dto.direction !== undefined) {
      // Normal form edit or update sent currentValue, baseline, targetValue or direction
      let actualProgress = 0;
      if (targetDiff !== 0) {
        if (newDirection === 'up') {
          actualProgress = (finalCurrentValue - newBaseline) / targetDiff;
        } else {
          actualProgress = (newBaseline - finalCurrentValue) / targetDiff;
        }
      } else {
        actualProgress = finalCurrentValue === newTargetValue ? 1 : 0;
      }
      finalProgressPct = Math.min(100, Math.max(0, actualProgress * 100));
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
        currentValue: finalCurrentValue,
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.direction && { direction: dto.direction }),
        ...(dto.isMilestone !== undefined && { isMilestone: dto.isMilestone }),
        ...(dto.wbsParentId !== undefined && { wbsParentId: dto.wbsParentId }),
        progressPct: finalProgressPct,
        ...(dto.locationId !== undefined && { locationId: dto.locationId || null }),
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
        after: {
          ...JSON.parse(JSON.stringify(targetAfter)),
          note: dto.note || '',
          actorName: userName,
        },
        ip,
      },
    });

    await this.evaluateAlertsForTarget(targetAfter.id);

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

  async getAuditLog(id: string, userVerticals: string[]) {
    // Verify access via findOne
    await this.findOne(id, userVerticals);

    return this.prisma.auditLog.findMany({
      where: {
        resourceType: 'target',
        resourceId: id,
        action: { in: ['UPDATE', 'SCHEDULE_CHANGE'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async evaluateAlertsForTarget(targetId: string) {
    const target = await this.prisma.target.findUnique({
      where: { id: targetId },
    });
    if (!target) return;

    const status = calculateRagStatus(
      target.startDate,
      target.deadline,
      target.baseline,
      target.targetValue,
      target.currentValue,
      target.direction as 'up' | 'down',
      new Date(),
    );

    const activeAlert = await this.prisma.alert.findFirst({
      where: {
        targetId: target.id,
        resolvedAt: null,
      },
    });

    const now = new Date();

    if (status.ragStatus === 'RED' || status.ragStatus === 'AMBER') {
      if (!activeAlert) {
        // Raise new alert
        await this.prisma.alert.create({
          data: {
            targetId: target.id,
            ragStatus: status.ragStatus,
            gapPoints: status.gap,
            raisedAt: now,
          },
        });
      } else {
        // Update active alert gap/status
        await this.prisma.alert.update({
          where: { id: activeAlert.id },
          data: {
            ragStatus: status.ragStatus,
            gapPoints: status.gap,
          },
        });
      }
    } else {
      // GREEN target: resolve alert if active
      if (activeAlert) {
        await this.prisma.alert.update({
          where: { id: activeAlert.id },
          data: {
            resolvedAt: now,
          },
        });
      }
    }
  }
}
