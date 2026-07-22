import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        verticalScope: true,
        isActive: true,
        createdAt: true,
        roles: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

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
        roles: {
          connect: dbRoles.map((r) => ({ id: r.id })),
        },
      },
      include: { roles: true },
    });

    // Write Audit Log
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

  async updateRoles(
    id: string,
    roles: string[],
    verticalScope: string[],
    actorId: string,
    ip: string,
  ) {
    const userBefore = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!userBefore) {
      throw new NotFoundException('User not found');
    }

    const dbRoles = await this.prisma.role.findMany({
      where: { name: { in: roles } },
    });

    const userAfter = await this.prisma.user.update({
      where: { id },
      data: {
        verticalScope,
        roles: {
          set: dbRoles.map((r) => ({ id: r.id })),
        },
      },
      include: { roles: true },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'UPDATE_USER_ROLES',
        resourceType: 'user',
        resourceId: id,
        before: {
          roles: userBefore.roles.map((r) => r.name),
          verticalScope: userBefore.verticalScope,
        },
        after: {
          roles: userAfter.roles.map((r) => r.name),
          verticalScope: userAfter.verticalScope,
        },
        ip,
      },
    });

    return {
      id: userAfter.id,
      email: userAfter.email,
      name: userAfter.name,
      verticalScope: userAfter.verticalScope,
      roles: userAfter.roles.map((r) => r.name),
    };
  }
}
