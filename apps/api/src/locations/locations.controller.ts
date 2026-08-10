import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  UpdateLocationStatusDto,
} from './dto/location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /** GET /locations — all authenticated users — returns ACTIVE locations for dropdowns */
  @Get()
  async findActive() {
    return this.locationsService.findAllActive();
  }

  /** GET /locations/all — SUPER_ADMIN only — returns all locations incl. inactive */
  @Get('all')
  async findAll(@Req() req: any) {
    this.requireAdmin(req);
    return this.locationsService.findAll();
  }

  /** POST /locations — SUPER_ADMIN only */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLocationDto, @Req() req: any) {
    this.requireAdmin(req);
    return this.locationsService.create(dto, req.user.sub);
  }

  /** PATCH /locations/:id — SUPER_ADMIN only */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @Req() req: any,
  ) {
    this.requireAdmin(req);
    return this.locationsService.update(id, dto);
  }

  /** PATCH /locations/:id/status — SUPER_ADMIN only — activate/deactivate */
  @Patch(':id/status')
  async setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLocationStatusDto,
    @Req() req: any,
  ) {
    this.requireAdmin(req);
    return this.locationsService.setStatus(id, dto.status);
  }

  private requireAdmin(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can manage locations');
    }
  }
}
