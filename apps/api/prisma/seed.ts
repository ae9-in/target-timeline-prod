import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create Roles
  const rolesData = [
    { name: 'SUPER_ADMIN' },
    { name: 'LEADERSHIP' },
    { name: 'SALES_MANAGER' },
    { name: 'PRODUCTION_MANAGER' },
    { name: 'HR_MANAGER' },
    { name: 'PLANNING_ANALYST' },
    { name: 'VIEWER' },
  ];

  const roles: Record<string, any> = {};
  for (const role of rolesData) {
    roles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // 2. Create Permissions
  // Format: roleId, resource, action, scope
  const permissions = [
    // SUPER_ADMIN has * on all resources
    { roleId: roles.SUPER_ADMIN.id, resource: '*', action: '*', scope: null },

    // LEADERSHIP has read-only on everything, export on report
    { roleId: roles.LEADERSHIP.id, resource: '*', action: 'read', scope: null },
    { roleId: roles.LEADERSHIP.id, resource: 'report', action: 'export', scope: null },

    // SALES_MANAGER
    { roleId: roles.SALES_MANAGER.id, resource: 'dashboard', action: 'read', scope: null },
    { roleId: roles.SALES_MANAGER.id, resource: 'timeline', action: 'read', scope: null },
    { roleId: roles.SALES_MANAGER.id, resource: 'calendar', action: 'read', scope: null },
    { roleId: roles.SALES_MANAGER.id, resource: 'department_performance', action: 'read', scope: null },
    { roleId: roles.SALES_MANAGER.id, resource: 'analytics', action: 'read', scope: null },
    { roleId: roles.SALES_MANAGER.id, resource: 'alert', action: 'read', scope: null },
    { roleId: roles.SALES_MANAGER.id, resource: 'alert', action: 'update', scope: { vertical: 'Sales' } },
    { roleId: roles.SALES_MANAGER.id, resource: 'target', action: 'create', scope: { vertical: 'Sales' } },
    { roleId: roles.SALES_MANAGER.id, resource: 'target', action: 'read', scope: null }, // can read other verticals
    { roleId: roles.SALES_MANAGER.id, resource: 'target', action: 'update', scope: { vertical: 'Sales' } },
    { roleId: roles.SALES_MANAGER.id, resource: 'target', action: 'delete', scope: { vertical: 'Sales' } },
    { roleId: roles.SALES_MANAGER.id, resource: 'report', action: 'read', scope: null },

    // PRODUCTION_MANAGER
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'dashboard', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'timeline', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'calendar', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'department_performance', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'analytics', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'alert', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'alert', action: 'update', scope: { vertical: 'Production' } },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'target', action: 'create', scope: { vertical: 'Production' } },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'target', action: 'read', scope: null },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'target', action: 'update', scope: { vertical: 'Production' } },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'target', action: 'delete', scope: { vertical: 'Production' } },
    { roleId: roles.PRODUCTION_MANAGER.id, resource: 'report', action: 'read', scope: null },

    // HR_MANAGER
    { roleId: roles.HR_MANAGER.id, resource: 'dashboard', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'timeline', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'calendar', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'department_performance', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'analytics', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'alert', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'alert', action: 'update', scope: { vertical: 'Hiring' } },
    { roleId: roles.HR_MANAGER.id, resource: 'target', action: 'create', scope: { vertical: 'Hiring' } },
    { roleId: roles.HR_MANAGER.id, resource: 'target', action: 'read', scope: null },
    { roleId: roles.HR_MANAGER.id, resource: 'target', action: 'update', scope: { vertical: 'Hiring' } },
    { roleId: roles.HR_MANAGER.id, resource: 'target', action: 'delete', scope: { vertical: 'Hiring' } },
    { roleId: roles.HR_MANAGER.id, resource: 'report', action: 'read', scope: null },

    // PLANNING_ANALYST (timelines & deadlines across all, no target value editing)
    { roleId: roles.PLANNING_ANALYST.id, resource: 'dashboard', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'timeline', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'timeline', action: 'update', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'calendar', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'department_performance', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'analytics', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'alert', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'target', action: 'read', scope: null },
    { roleId: roles.PLANNING_ANALYST.id, resource: 'target', action: 'update', scope: null }, // can update dates, handled in controller code

    // VIEWER (scope is managed via User's verticalScope column)
    { roleId: roles.VIEWER.id, resource: 'dashboard', action: 'read', scope: null },
    { roleId: roles.VIEWER.id, resource: 'timeline', action: 'read', scope: null },
    { roleId: roles.VIEWER.id, resource: 'calendar', action: 'read', scope: null },
    { roleId: roles.VIEWER.id, resource: 'department_performance', action: 'read', scope: null },
    { roleId: roles.VIEWER.id, resource: 'analytics', action: 'read', scope: null },
    { roleId: roles.VIEWER.id, resource: 'alert', action: 'read', scope: null },
    { roleId: roles.VIEWER.id, resource: 'target', action: 'read', scope: null },
  ];

  await prisma.permission.deleteMany({});
  for (const perm of permissions) {
    await prisma.permission.create({
      data: {
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope ?? undefined,
        role: { connect: { id: perm.roleId } },
      },
    });
  }

  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

  // 3. Create Users
  const usersToSeed = [
    {
      email: 'admin@tt.com',
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      roles: { connect: [{ id: roles.SUPER_ADMIN.id }] },
      verticalScope: [],
    },
    {
      email: 'leadership@targets.com',
      passwordHash,
      name: 'Leadership User',
      roles: { connect: [{ id: roles.LEADERSHIP.id }] },
      verticalScope: [],
    },
    {
      email: 'sales_mgr@targets.com',
      passwordHash,
      name: 'Sales Manager',
      roles: { connect: [{ id: roles.SALES_MANAGER.id }] },
      verticalScope: ['Sales'],
    },
    {
      email: 'prod_mgr@targets.com',
      passwordHash,
      name: 'Production Manager',
      roles: { connect: [{ id: roles.PRODUCTION_MANAGER.id }] },
      verticalScope: ['Production'],
    },
    {
      email: 'hr_mgr@targets.com',
      passwordHash,
      name: 'HR Manager',
      roles: { connect: [{ id: roles.HR_MANAGER.id }] },
      verticalScope: ['Hiring'],
    },
    {
      email: 'planner@targets.com',
      passwordHash,
      name: 'Planning Analyst',
      roles: { connect: [{ id: roles.PLANNING_ANALYST.id }] },
      verticalScope: [],
    },
    {
      email: 'viewer_sales@targets.com',
      passwordHash,
      name: 'Sales Viewer',
      roles: { connect: [{ id: roles.VIEWER.id }] },
      verticalScope: ['Sales'],
    },
  ];

  for (const userData of usersToSeed) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        roles: userData.roles,
        verticalScope: userData.verticalScope,
      },
      create: userData,
    });
  }

  // 4. Targets are NOT seeded — all target data must be created by real users via the application.
  // No dummy data.

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
