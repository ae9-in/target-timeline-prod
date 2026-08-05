import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSubDepartmentDto, UpdateSubDepartmentDto } from './dto/sub-department.dto';

@Injectable()
export class SubDepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(departmentId?: string) {
    return this.prisma.subDepartment.findMany({
      where: departmentId ? { departmentId } : {},
      orderBy: { createdAt: 'asc' },
      include: { department: true },
    });
  }

  async findOne(id: string) {
    const subDept = await this.prisma.subDepartment.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!subDept) throw new NotFoundException('Sub-Department not found');
    return subDept;
  }

  async create(dto: CreateSubDepartmentDto) {
    // Verify department exists
    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    // Check if name is taken in this department
    const existing = await this.prisma.subDepartment.findFirst({
      where: {
        departmentId: dto.departmentId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new BadRequestException('A sub-department with this name already exists in the selected department');
    }

    return this.prisma.subDepartment.create({
      data: {
        name: dto.name,
        departmentId: dto.departmentId,
        category: dto.category || null,
        fullTime: dto.fullTime || null,
        interns: dto.interns || null,
      },
      include: { department: true },
    });
  }

  async update(id: string, dto: UpdateSubDepartmentDto) {
    const subDeptBefore = await this.findOne(id);

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) throw new NotFoundException('Department not found');
    }

    if (dto.name) {
      const deptId = dto.departmentId || subDeptBefore.departmentId;
      const existing = await this.prisma.subDepartment.findFirst({
        where: {
          id: { not: id },
          departmentId: deptId,
          name: { equals: dto.name, mode: 'insensitive' },
        },
      });
      if (existing) {
        throw new BadRequestException('A sub-department with this name already exists in the department');
      }
    }

    return this.prisma.subDepartment.update({
      where: { id },
      data: {
        name: dto.name,
        departmentId: dto.departmentId,
        category: dto.category !== undefined ? dto.category : undefined,
        fullTime: dto.fullTime !== undefined ? dto.fullTime : undefined,
        interns: dto.interns !== undefined ? dto.interns : undefined,
      },
      include: { department: true },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.subDepartment.delete({
      where: { id },
    });
  }
}
