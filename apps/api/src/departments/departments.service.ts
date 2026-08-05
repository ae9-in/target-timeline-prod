import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const depts = await this.prisma.department.findMany({
      orderBy: { createdAt: 'asc' },
      include: { location: true },
    });
    return depts.map((d) => ({
      ...d,
      locationName: d.location?.name || undefined,
    }));
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return {
      ...dept,
      locationName: dept.location?.name || undefined,
    };
  }

  async create(dto: CreateDepartmentDto) {
    // Check if name is taken
    const existing = await this.prisma.department.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('A department with this name already exists');
    }

    // If location is provided, verify it exists
    if (dto.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!loc) throw new BadRequestException('Assigned location not found');
    }

    const dept = await this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        color: dto.color,
        lead: dto.lead || 'Unassigned',
        description: dto.description,
        locationId: dto.locationId,
      },
      include: { location: true },
    });

    return {
      ...dept,
      locationName: dept.location?.name || undefined,
    };
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const deptBefore = await this.prisma.department.findUnique({ where: { id } });
    if (!deptBefore) throw new NotFoundException('Department not found');

    if (dto.name && dto.name !== deptBefore.name) {
      const existing = await this.prisma.department.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('A department with this name already exists');
      }
    }

    if (dto.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!loc) throw new BadRequestException('Assigned location not found');
    }

    const dept = await this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code ? dto.code.toUpperCase() : undefined,
        color: dto.color,
        lead: dto.lead,
        description: dto.description,
        locationId: dto.locationId,
      },
      include: { location: true },
    });

    return {
      ...dept,
      locationName: dept.location?.name || undefined,
    };
  }

  async delete(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }

  /**
   * Seeds initial default departments if none exist in the database yet
   */
  async seedDefaults() {
    const count = await this.prisma.department.count();
    if (count > 0) return;

    const defaults = [
      { name: 'Sales', code: 'SLS', color: '#3b82f6', description: 'Sales and Business Development vertical', isSystem: true },
      { name: 'Production', code: 'PRD', color: '#10b981', description: 'Manufacturing and Production vertical', isSystem: true },
      { name: 'HR', code: 'HRM', color: '#f59e0b', description: 'Human Resources and Recruitment', isSystem: true },
      { name: 'Planning', code: 'PLN', color: '#8b5cf6', description: 'Strategic Planning and Analysis', isSystem: true },
    ];

    for (const d of defaults) {
      await this.prisma.department.create({ data: d });
    }
  }
}
