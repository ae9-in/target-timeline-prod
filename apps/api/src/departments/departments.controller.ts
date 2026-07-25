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

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /** GET /departments — returns all active/defined departments in the database */
  @Get()
  async findAll() {
    // Automatically make sure default system departments exist on fetch
    await this.departmentsService.seedDefaults();
    return this.departmentsService.findAll();
  }

  /** GET /departments/:id */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  /** POST /departments — SUPER_ADMIN only */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDepartmentDto, @Req() req: any) {
    this.requireAdmin(req);
    return this.departmentsService.create(dto);
  }

  /** PATCH /departments/:id — SUPER_ADMIN only */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @Req() req: any) {
    this.requireAdmin(req);
    return this.departmentsService.update(id, dto);
  }

  /** DELETE /departments/:id — SUPER_ADMIN only */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    this.requireAdmin(req);
    return this.departmentsService.delete(id);
  }

  private requireAdmin(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only admins can manage departments');
    }
  }
}
