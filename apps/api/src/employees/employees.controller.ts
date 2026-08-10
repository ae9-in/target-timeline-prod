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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEmployeeDto, @Req() req: any) {
    this.requireAdmin(req);
    return this.employeesService.create(dto);
  }

  @Get()
  async findAll(
    @Query('departmentId') departmentId: string,
    @Query('locationId') locationId: string,
    @Req() req: any,
  ) {
    return this.employeesService.findAll({ departmentId, locationId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    this.requireAdmin(req);
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    this.requireAdmin(req);
    return this.employeesService.delete(id);
  }

  private requireAdmin(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can manage employees');
    }
  }
}
