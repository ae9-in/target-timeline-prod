import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    // Verify department exists
    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept)
      throw new NotFoundException(
        `Department with ID ${dto.departmentId} not found`,
      );

    // Verify location exists
    const loc = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!loc)
      throw new NotFoundException(
        `Location with ID ${dto.locationId} not found`,
      );

    return this.prisma.employee.create({
      data: {
        name: dto.name,
        employmentType: dto.employmentType,
        departmentId: dto.departmentId,
        locationId: dto.locationId,
      },
      include: {
        department: true,
        location: true,
      },
    });
  }

  async findAll(filters: { departmentId?: string; locationId?: string }) {
    const where: any = {};
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    return this.prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        department: true,
        location: true,
      },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        location: true,
      },
    });
    if (!employee)
      throw new NotFoundException(`Employee with ID ${id} not found`);
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept)
        throw new NotFoundException(
          `Department with ID ${dto.departmentId} not found`,
        );
    }

    if (dto.locationId) {
      const loc = await this.prisma.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!loc)
        throw new NotFoundException(
          `Location with ID ${dto.locationId} not found`,
        );
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.employmentType !== undefined && {
          employmentType: dto.employmentType,
        }),
        ...(dto.departmentId !== undefined && {
          departmentId: dto.departmentId,
        }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
      },
      include: {
        department: true,
        location: true,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}
