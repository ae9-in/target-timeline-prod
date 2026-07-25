import { Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { RolesPermissionsController } from './roles-permissions.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RolesPermissionsController],
  providers: [PermissionsGuard, PrismaService],
  exports: [PermissionsGuard],
})
export class RbacModule {}
