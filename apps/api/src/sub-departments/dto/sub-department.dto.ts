import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  fullTime?: string;

  @IsString()
  @IsOptional()
  interns?: string;
}

export class UpdateSubDepartmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  fullTime?: string;

  @IsString()
  @IsOptional()
  interns?: string;
}
