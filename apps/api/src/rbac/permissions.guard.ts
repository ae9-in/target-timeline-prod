import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { REQUIRE_PERMISSION_KEY, RequiredPermission } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no permission is required by the decorator, allow access
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User session not found');
    }

    const { resource, action } = requiredPermission;

    // 1. Fetch permissions from DB for user's roles
    const dbPermissions = await this.prisma.permission.findMany({
      where: {
        role: {
          name: {
            in: user.roles,
          },
        },
      },
    });

    // 2. Check if user has a permission that satisfies the resource and action
    // Wildcard '*' is supported for resource and action
    const matchingPermissions = dbPermissions.filter(perm => {
      const matchResource = perm.resource === '*' || perm.resource === resource;
      const matchAction = perm.action === '*' || perm.action === action;
      return matchResource && matchAction;
    });

    if (matchingPermissions.length === 0) {
      throw new ForbiddenException(`Insufficient permissions to perform ${action} on ${resource}`);
    }

    // 3. Enforce vertical scopes if resource is 'target' or has a vertical property
    if (resource === 'target' || resource === 'alert') {
      await this.enforceVerticalScope(request, user, matchingPermissions, resource, action);
    }

    return true;
  }

  private async enforceVerticalScope(
    request: any,
    user: any,
    permissions: any[],
    resource: string,
    action: string,
  ): Promise<void> {
    const userVerticals: string[] = user.verticalScope || [];
    const hasGlobalAccess = userVerticals.length === 0 || user.roles.includes('SUPER_ADMIN') || user.roles.includes('LEADERSHIP');

    let targetVertical: string | null = null;

    // A. For mutations or reads on a specific target (e.g. GET /targets/:id, PATCH /targets/:id)
    if (request.params.id) {
      if (resource === 'target') {
        const target = await this.prisma.target.findUnique({
          where: { id: request.params.id },
        });

        if (!target) {
          throw new NotFoundException('Target not found');
        }
        targetVertical = target.vertical;
      } else if (resource === 'alert') {
        const alert = await this.prisma.alert.findUnique({
          where: { id: request.params.id },
        });
        if (!alert) {
          throw new NotFoundException('Alert not found');
        }
        // Fetch target of the alert to find vertical
        const target = await this.prisma.target.findUnique({
          where: { id: alert.targetId },
        });
        if (target) {
          targetVertical = target.vertical;
        }
      }
    }

    // B. For target creation (e.g. POST /targets) or updates with body vertical
    if (request.body && request.body.vertical) {
      targetVertical = request.body.vertical;
    }

    // If we have a target vertical to check
    if (targetVertical) {
      // 1. Check against user's user-record level verticalScope
      if (!hasGlobalAccess && !userVerticals.includes(targetVertical)) {
        throw new ForbiddenException(
          `Access Denied: You are restricted to the following vertical scopes: ${userVerticals.join(', ')}`
        );
      }

      // 2. Check against the matching database permissions scopes
      const hasScopedPermission = permissions.some(perm => {
        // If permission scope is null, it means no vertical constraint on this permission
        if (!perm.scope) return true;

        const scopeObj = perm.scope as Record<string, any>;
        return scopeObj.vertical === targetVertical;
      });

      if (!hasScopedPermission) {
        throw new ForbiddenException(
          `Access Denied: Your permissions do not allow ${action} on ${targetVertical} targets.`
        );
      }
    }
  }
}
