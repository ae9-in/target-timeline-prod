import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LocationsController],
  providers: [LocationsService, PrismaService],
  exports: [LocationsService],
})
export class LocationsModule {}
