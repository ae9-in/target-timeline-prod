import { Module } from '@nestjs/common';
import { TargetsService } from './targets.service';
import { GanttService } from './gantt.service';
import { TargetsController } from './targets.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [TargetsController],
  providers: [TargetsService, GanttService, PrismaService],
  exports: [TargetsService, GanttService],
})
export class TargetsModule {}
