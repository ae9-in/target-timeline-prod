import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDependencyDto, ScheduleUpdateDto, BaselineLabelDto } from './dto/gantt.dto';
import { hasCycle, computeCriticalPath, CpmTask, CpmDependency } from './cpm.util';
import { calculateRagStatus } from './rag.util';

@Injectable()
export class GanttService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all targets shaped for the Gantt chart, including dependencies and latest baseline.
   */
  async getGanttData(
    userVerticals: string[],
    vertical?: string,
    groupBy?: string,
    locationId?: string,
  ) {
    const where: any = {};
    if (userVerticals.length > 0) where.vertical = { in: userVerticals };
    if (vertical) {
      if (userVerticals.length > 0 && !userVerticals.includes(vertical)) return [];
      where.vertical = vertical;
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const targets = await this.prisma.target.findMany({
      where,
      include: {
        dependencies: true,
        dependents: true,
        baselines: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
        },
        location: { select: { id: true, name: true } },
        subDepartment: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return targets.map((t) => {
      const rag = calculateRagStatus(
        t.startDate,
        t.deadline,
        t.baseline,
        t.targetValue,
        t.currentValue,
        t.direction as 'up' | 'down',
      );
      return {
        ...t,
        ...rag,
        latestBaseline: t.baselines[0] ?? null,
      };
    });
  }


  /**
   * Add a dependency from predecessorId → targetId (the target is the successor).
   * Performs cycle detection before persisting.
   */
  async addDependency(
    targetId: string,
    dto: CreateDependencyDto,
    userId: string,
    ip: string,
  ) {
    // Check both tasks exist
    const [successor, predecessor] = await Promise.all([
      this.prisma.target.findUnique({ where: { id: targetId } }),
      this.prisma.target.findUnique({ where: { id: dto.predecessorId } }),
    ]);
    if (!successor) throw new NotFoundException('Successor target not found');
    if (!predecessor) throw new NotFoundException('Predecessor target not found');

    if (dto.predecessorId === targetId) {
      throw new UnprocessableEntityException('A task cannot depend on itself');
    }

    // Load existing deps + the proposed new one for cycle check
    const existingDeps = await this.prisma.targetDependency.findMany({
      select: { predecessorId: true, successorId: true },
    });
    const allTaskIds = (await this.prisma.target.findMany({ select: { id: true } })).map((t) => t.id);

    const proposedDeps = [
      ...existingDeps,
      { predecessorId: dto.predecessorId, successorId: targetId },
    ];

    if (hasCycle(proposedDeps, allTaskIds)) {
      throw new UnprocessableEntityException(
        'Adding this dependency would create a circular dependency chain',
      );
    }

    const dep = await this.prisma.targetDependency.create({
      data: {
        predecessorId: dto.predecessorId,
        successorId: targetId,
        type: dto.type ?? 'FS',
        lagDays: dto.lagDays ?? 0,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'CREATE_DEPENDENCY',
        resourceType: 'target_dependency',
        resourceId: dep.id,
        after: JSON.parse(JSON.stringify(dep)),
        ip,
      },
    });

    return dep;
  }

  /**
   * Delete a dependency by its own ID.
   */
  async deleteDependency(depId: string, userId: string, ip: string) {
    const dep = await this.prisma.targetDependency.findUnique({ where: { id: depId } });
    if (!dep) throw new NotFoundException('Dependency not found');

    await this.prisma.targetDependency.delete({ where: { id: depId } });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'DELETE_DEPENDENCY',
        resourceType: 'target_dependency',
        resourceId: depId,
        before: JSON.parse(JSON.stringify(dep)),
        ip,
      },
    });

    return { success: true };
  }

  /**
   * Compute critical path for the given vertical scope.
   * Returns ordered list of task IDs on the critical path + float per task.
   */
  async getCriticalPath(userVerticals: string[], vertical?: string) {
    const where: any = {};
    if (userVerticals.length > 0) where.vertical = { in: userVerticals };
    if (vertical) where.vertical = vertical;

    const targets = await this.prisma.target.findMany({
      where,
      include: { dependents: true },
    });

    const allIds = targets.map((t) => t.id);
    const allDeps = await this.prisma.targetDependency.findMany({
      where: {
        predecessorId: { in: allIds },
        successorId: { in: allIds },
      },
    });

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const cpmTasks: CpmTask[] = targets.map((t) => ({
      id: t.id,
      startDate: t.startDate,
      deadline: t.deadline,
      durationDays: Math.max(
        1,
        Math.ceil((t.deadline.getTime() - t.startDate.getTime()) / MS_PER_DAY),
      ),
    }));

    const cpmDeps: CpmDependency[] = allDeps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type,
      lagDays: d.lagDays,
    }));

    const results = computeCriticalPath(cpmTasks, cpmDeps);

    const criticalIds = results.filter((r) => r.isCritical).map((r) => r.id);

    return {
      criticalPath: criticalIds,
      taskFloats: results.map((r) => ({
        id: r.id,
        float: r.float,
        isCritical: r.isCritical,
      })),
    };
  }

  /**
   * Snapshot current start/end into a new TargetBaseline row.
   */
  async snapshotBaseline(
    targetId: string,
    dto: BaselineLabelDto,
    userId: string,
    ip: string,
  ) {
    const target = await this.prisma.target.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Target not found');

    const baseline = await this.prisma.targetBaseline.create({
      data: {
        targetId,
        baselineStart: target.startDate,
        baselineEnd: target.deadline,
        label: dto.label,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SET_BASELINE',
        resourceType: 'target_baseline',
        resourceId: baseline.id,
        after: JSON.parse(JSON.stringify(baseline)),
        ip,
      },
    });

    return baseline;
  }

  /**
   * Get the most recent baseline for a target.
   */
  async getLatestBaseline(targetId: string) {
    const target = await this.prisma.target.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Target not found');

    return this.prisma.targetBaseline.findFirst({
      where: { targetId },
      orderBy: { capturedAt: 'desc' },
    });
  }

  /**
   * Dedicated schedule update endpoint — updates start/end/progressPct.
   * Writes SCHEDULE_CHANGE audit log with before/after.
   * RBAC-gated by the controller via PermissionsGuard.
   */
  async scheduleUpdate(
    targetId: string,
    dto: ScheduleUpdateDto,
    userId: string,
    userName: string,
    userVerticals: string[],
    roles: string[],
    ip: string,
  ) {
    const targetBefore = await this.prisma.target.findUnique({ where: { id: targetId } });
    if (!targetBefore) throw new NotFoundException('Target not found');

    // Enforce vertical scope
    if (userVerticals.length > 0 && !userVerticals.includes(targetBefore.vertical)) {
      throw new ForbiddenException('Access to this target vertical is restricted');
    }

    // PLANNING_ANALYST can update schedules; ADMIN and manager-level roles can too
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'PRODUCTION_MANAGER', 'HR_MANAGER', 'PLANNING_ANALYST'];
    const hasPermission = roles.some((r) => allowedRoles.includes(r));
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to reschedule targets');
    }

    const updateData: any = {};
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.deadline !== undefined) updateData.deadline = new Date(dto.deadline);
    
    if (dto.progressPct !== undefined) {
      updateData.progressPct = dto.progressPct;
      
      const baseline = targetBefore.baseline;
      const targetValue = targetBefore.targetValue;
      const direction = targetBefore.direction;
      const targetDiff = direction === 'up' ? targetValue - baseline : baseline - targetValue;
      
      if (targetDiff !== 0) {
        if (direction === 'up') {
          updateData.currentValue = baseline + (dto.progressPct / 100) * targetDiff;
        } else {
          updateData.currentValue = baseline - (dto.progressPct / 100) * targetDiff;
        }
      } else {
        updateData.currentValue = dto.progressPct >= 100 ? targetValue : baseline;
      }
    }

    const targetAfter = await this.prisma.target.update({
      where: { id: targetId },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SCHEDULE_CHANGE',
        resourceType: 'target',
        resourceId: targetId,
        before: {
          startDate: targetBefore.startDate,
          deadline: targetBefore.deadline,
          progressPct: targetBefore.progressPct,
        },
        after: {
          startDate: targetAfter.startDate,
          deadline: targetAfter.deadline,
          progressPct: targetAfter.progressPct,
          note: dto.note || '',
          actorName: userName,
        },
        ip,
      },
    });

    await this.evaluateAlertsForTarget(targetId);

    return targetAfter;
  }

  private async evaluateAlertsForTarget(targetId: string) {
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
