import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List all users (with optional filters) ─────────────────────────────────

  async findAll(filters?: {
    role?: string;
    vertical?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.vertical) {
      where.verticalScope = { has: filters.vertical };
    }

    if (filters?.role) {
      where.roles = {
        some: { name: filters.role },
      };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        verticalScope: true,
        isActive: true,
        status: true,
        mustChangePassword: true,
        invitedAt: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get single user ────────────────────────────────────────────────────────

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        verticalScope: true,
        isActive: true,
        status: true,
        mustChangePassword: true,
        invitedBy: true,
        invitedAt: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Create user (legacy — kept for backward-compat with existing controller) ─

  async create(dto: CreateUserDto, actorId: string, ip: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const dbRoles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        verticalScope: dto.verticalScope || [],
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: { connect: dbRoles.map((r) => ({ id: r.id })) },
      },
      include: { roles: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CREATE_USER',
        resourceType: 'user',
        resourceId: user.id,
        after: {
          email: user.email,
          name: user.name,
          roles: dto.roles,
          verticalScope: user.verticalScope,
        },
        ip,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      verticalScope: user.verticalScope,
      roles: user.roles.map((r) => r.name),
    };
  }

  // ─── Update user (roles, verticalScope, or status) ──────────────────────────

  async updateUser(
    id: string,
    updates: { roles?: string[]; verticalScope?: string[]; status?: string },
    actorId: string,
    ip: string,
  ) {
    const userBefore = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!userBefore) throw new NotFoundException('User not found');

    const data: any = {};
    const auditActions: Array<{ action: string; before: any; after: any }> = [];

    // Roles change
    if (updates.roles !== undefined) {
      const dbRoles = await this.prisma.role.findMany({
        where: { name: { in: updates.roles } },
      });
      data.roles = { set: dbRoles.map((r) => ({ id: r.id })) };

      const beforeRoles = userBefore.roles.map((r) => r.name);
      const afterRoles = updates.roles;
      if (
        JSON.stringify([...beforeRoles].sort()) !==
        JSON.stringify([...afterRoles].sort())
      ) {
        auditActions.push({
          action: 'USER_ROLE_CHANGED',
          before: { roles: beforeRoles },
          after: { roles: afterRoles },
        });
      }
    }

    // Vertical scope change
    if (updates.verticalScope !== undefined) {
      data.verticalScope = updates.verticalScope;
      const beforeScope = userBefore.verticalScope;
      if (
        JSON.stringify(beforeScope.sort()) !==
        JSON.stringify([...updates.verticalScope].sort())
      ) {
        auditActions.push({
          action: 'USER_VERTICAL_SCOPE_CHANGED',
          before: { verticalScope: beforeScope },
          after: { verticalScope: updates.verticalScope },
        });
      }
    }

    const userAfter = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: true },
    });

    // Write one audit entry per distinct change type
    for (const entry of auditActions) {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: entry.action,
          resourceType: 'user',
          resourceId: id,
          before: entry.before,
          after: entry.after,
          ip,
        },
      });
    }

    return {
      id: userAfter.id,
      email: userAfter.email,
      name: userAfter.name,
      status: userAfter.status,
      verticalScope: userAfter.verticalScope,
      roles: userAfter.roles.map((r) => r.name),
    };
  }

  // ─── Legacy: updateRoles (kept for old controller endpoint) ─────────────────

  async updateRoles(
    id: string,
    roles: string[],
    verticalScope: string[],
    actorId: string,
    ip: string,
  ) {
    return this.updateUser(id, { roles, verticalScope }, actorId, ip);
  }
}
