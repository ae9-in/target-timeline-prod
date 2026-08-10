import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('user', 'read')
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @RequirePermission('user', 'create')
  async create(
    @Body() createUserDto: CreateUserDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const actorId = req.user.sub;
    return this.usersService.create(createUserDto, actorId, ip || 'Unknown');
  }

  @Patch(':id/roles')
  @RequirePermission('user', 'update')
  async updateRoles(
    @Param('id') id: string,
    @Body() body: { roles: string[]; verticalScope: string[] },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const actorId = req.user.sub;
    return this.usersService.updateRoles(
      id,
      body.roles,
      body.verticalScope,
      actorId,
      ip || 'Unknown',
    );
  }
}
