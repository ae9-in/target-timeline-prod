import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { JobsService } from '../jobs/jobs.service';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, JobsService],
  exports: [ReportsService],
})
export class ReportsModule {}
