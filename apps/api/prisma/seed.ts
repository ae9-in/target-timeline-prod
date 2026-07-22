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

  // 4. Create Targets and Snapshots
  const targetsData = [
    {
      name: 'Q3 Enterprise Sales Target',
      vertical: 'Sales',
      owner: 'John Doe',
      startDate: new Date('2026-07-01T00:00:00Z'),
      deadline: new Date('2026-09-30T00:00:00Z'),
      baseline: 100000,
      targetValue: 500000,
      currentValue: 220000, // On track (expected: ~18% elapsed, progress ~30%)
      unit: 'USD',
      direction: 'up',
      createdBy: 'System Seed',
    },
    {
      name: 'Q3 Outbound Lead Generation',
      vertical: 'Sales',
      owner: 'Jane Smith',
      startDate: new Date('2026-07-01T00:00:00Z'),
      deadline: new Date('2026-09-30T00:00:00Z'),
      baseline: 0,
      targetValue: 1200,
      currentValue: 150, // Behind track (expected: ~18%, actual: 12.5% -> Amber/Red)
      unit: 'Leads',
      direction: 'up',
      createdBy: 'System Seed',
    },
    {
      name: 'Factory Output Optimization',
      vertical: 'Production',
      owner: 'Mike Miller',
      startDate: new Date('2026-07-01T00:00:00Z'),
      deadline: new Date('2026-08-31T00:00:00Z'),
      baseline: 50,
      targetValue: 95,
      currentValue: 55, // Behind (expected: 27% elapsed, actual: 11% progress -> Red)
      unit: '% Efficiency',
      direction: 'up',
      createdBy: 'System Seed',
    },
    {
      name: 'Q3 Engineering Hiring Plan',
      vertical: 'Hiring',
      owner: 'Sarah Connor',
      startDate: new Date('2026-07-01T00:00:00Z'),
      deadline: new Date('2026-09-30T00:00:00Z'),
      baseline: 0,
      targetValue: 15,
      currentValue: 4, // On pace
      unit: 'Engineers',
      direction: 'up',
      createdBy: 'System Seed',
    },
    {
      name: 'Minimize System Downtime',
      vertical: 'Production',
      owner: 'Alex Stone',
      startDate: new Date('2026-07-01T00:00:00Z'),
      deadline: new Date('2026-12-31T00:00:00Z'),
      baseline: 200,
      targetValue: 20,
      currentValue: 40, // Direction down, currentValue is 40. Expected baseline to 20 over 6 months. Currently 18 days in. Progress is good.
      unit: 'Minutes',
      direction: 'down',
      createdBy: 'System Seed',
    },
  ];

  await prisma.target.deleteMany({});
  await prisma.targetSnapshot.deleteMany({});
  await prisma.alert.deleteMany({});

  for (const targetVal of targetsData) {
    const createdTarget = await prisma.target.create({ data: targetVal });
    
    // Create initial snapshots for the past 5 days to feed department performance
    for (let i = 5; i >= 0; i--) {
      const snapshotDate = new Date();
      snapshotDate.setDate(snapshotDate.getDate() - i);

      // Interpolate value slightly
      const fraction = (5 - i) / 5;
      const val = targetVal.baseline + (targetVal.currentValue - targetVal.baseline) * fraction;

      // Determine RAG status
      const totalTime = targetVal.deadline.getTime() - targetVal.startDate.getTime();
      const timeElapsed = snapshotDate.getTime() - targetVal.startDate.getTime();
      const expectedProgress = Math.max(0, Math.min(1, timeElapsed / totalTime));

      let actualProgress = 0;
      if (targetVal.direction === 'up') {
        actualProgress = (val - targetVal.baseline) / (targetVal.targetValue - targetVal.baseline);
      } else {
        actualProgress = (targetVal.baseline - val) / (targetVal.baseline - targetVal.targetValue);
      }

      const gap = expectedProgress - actualProgress;
      let rag = 'GREEN';
      if (gap > 0.2) {
        rag = 'RED';
      } else if (gap > 0.05) {
        rag = 'AMBER';
      }

      await prisma.targetSnapshot.create({
        data: {
          targetId: createdTarget.id,
          currentValue: val,
          ragStatus: rag,
          capturedAt: snapshotDate,
        },
      });
    }
  }

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
