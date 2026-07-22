import { IsString, IsOptional, IsNumber, IsIn, Min, Max, IsBoolean } from 'class-validator';

export class CreateDependencyDto {
  @IsString()
  predecessorId: string;

  @IsString()
  @IsIn(['FS', 'SS', 'FF', 'SF'])
  type: string = 'FS';

  @IsNumber()
  @IsOptional()
  lagDays?: number = 0;
}

export class ScheduleUpdateDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  progressPct?: number;
}

export class BaselineLabelDto {
  @IsString()
  label: string;
}
