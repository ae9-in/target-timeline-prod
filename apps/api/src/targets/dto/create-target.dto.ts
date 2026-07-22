import { IsString, IsNotEmpty, IsEnum, IsDateString, IsNumber, IsOptional } from 'class-validator';

export class CreateTargetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['Sales', 'Production', 'Hiring'])
  vertical: string;

  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  deadline: string;

  @IsNumber()
  baseline: number;

  @IsNumber()
  targetValue: number;

  @IsNumber()
  currentValue: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['up', 'down'])
  direction: string;
}

export class UpdateTargetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['Sales', 'Production', 'Hiring'])
  vertical?: string;

  @IsString()
  @IsOptional()
  owner?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsNumber()
  @IsOptional()
  baseline?: number;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['up', 'down'])
  direction?: string;
}
