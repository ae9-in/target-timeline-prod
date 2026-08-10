import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

/**
 * Read-only view of the roles → permissions matrix.
 * SUPER_ADMIN-only via the standard PermissionsGuard.
 */
@Controller('admin/roles-permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesPermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('user', 'read') // Only SUPER_ADMIN has user:read → access to this screen
  async getAll() {
    return this.prisma.permission.findMany({
      include: { role: { select: { name: true } } },
      orderBy: [
        { role: { name: 'asc' } },
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }
}
