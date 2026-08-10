import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /** GET /departments — returns all active/defined departments in the database */
  @Get()
  @RequirePermission('department', 'read')
  async findAll() {
    // Automatically make sure default system departments exist on fetch
    await this.departmentsService.seedDefaults();
    return this.departmentsService.findAll();
  }

  /** GET /departments/:id */
  @Get(':id')
  @RequirePermission('department', 'read')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  /** POST /departments — SUPER_ADMIN only */
  @Post()
  @RequirePermission('department', 'update')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDepartmentDto, @Req() req: any) {
    this.requireAdmin(req);
    return this.departmentsService.create(dto);
  }

  /** PATCH /departments/:id — SUPER_ADMIN only */
  @Patch(':id')
  @RequirePermission('department', 'update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: any,
  ) {
    this.requireAdmin(req);
    return this.departmentsService.update(id, dto);
  }

  /** DELETE /departments/:id — SUPER_ADMIN only */
  @Delete(':id')
  @RequirePermission('department', 'update')
  async delete(@Param('id') id: string, @Req() req: any) {
    this.requireAdmin(req);
    return this.departmentsService.delete(id);
  }

  private requireAdmin(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can manage departments');
    }
  }
}
