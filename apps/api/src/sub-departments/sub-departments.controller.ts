import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { SubDepartmentsService } from './sub-departments.service';
import { CreateSubDepartmentDto, UpdateSubDepartmentDto } from './dto/sub-department.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('sub-departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubDepartmentsController {
  constructor(private readonly subDepartmentsService: SubDepartmentsService) {}

  @Get()
  @RequirePermission('department', 'read')
  async findAll(@Query('departmentId') departmentId?: string) {
    return this.subDepartmentsService.findAll(departmentId);
  }

  @Get(':id')
  @RequirePermission('department', 'read')
  async findOne(@Param('id') id: string) {
    return this.subDepartmentsService.findOne(id);
  }

  @Post()
  @RequirePermission('department', 'update')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSubDepartmentDto, @Req() req: any) {
    this.requireAdmin(req);
    return this.subDepartmentsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('department', 'update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubDepartmentDto,
    @Req() req: any,
  ) {
    this.requireAdmin(req);
    return this.subDepartmentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('department', 'update')
  async delete(@Param('id') id: string, @Req() req: any) {
    this.requireAdmin(req);
    return this.subDepartmentsService.delete(id);
  }

  private requireAdmin(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can manage sub-departments');
    }
  }
}
