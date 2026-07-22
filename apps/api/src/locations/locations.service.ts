import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all ACTIVE locations — used by all authenticated users for dropdowns */
  async findAllActive() {
    return this.prisma.location.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { targets: true } },
      },
    });
  }

  /** Returns ALL locations (including INACTIVE) — admin only */
  async findAll() {
    return this.prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { targets: true } },
      },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { targets: true } } },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async create(dto: CreateLocationDto, userId: string) {
    const existing = await this.prisma.location.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Location "${dto.name}" already exists`);

    return this.prisma.location.create({
      data: {
        name: dto.name,
        address: dto.address,
        timezone: dto.timezone,
        createdBy: userId,
        status: 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.location.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Location "${dto.name}" already exists`);
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });
  }

  async setStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.location.update({
      where: { id },
      data: { status },
    });
  }
}
