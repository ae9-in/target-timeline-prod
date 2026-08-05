import { Module } from '@nestjs/common';
import { SubDepartmentsService } from './sub-departments.service';
import { SubDepartmentsController } from './sub-departments.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SubDepartmentsController],
  providers: [SubDepartmentsService, PrismaService],
  exports: [SubDepartmentsService],
})
export class SubDepartmentsModule {}
