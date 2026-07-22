import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateLocationStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status: string;
}
