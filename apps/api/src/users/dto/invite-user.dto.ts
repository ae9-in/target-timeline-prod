import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsArray,
  IsOptional,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  verticalScope?: string[];
}
