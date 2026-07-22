import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [AuditController],
  providers: [PrismaService],
})
export class AuditModule {}
