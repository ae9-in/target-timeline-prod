import { Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PermissionsGuard, PrismaService],
  exports: [PermissionsGuard],
})
export class RbacModule {}
