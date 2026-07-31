import { IsString, IsNotEmpty, IsOptional, IsHexColor, Length, IsAlpha } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsAlpha()
  @Length(2, 3)
  code: string;

  @IsHexColor()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsOptional()
  lead?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locationId?: string;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsAlpha()
  @Length(2, 3)
  code?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  lead?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locationId?: string;
}
