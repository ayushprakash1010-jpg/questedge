import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class AddSupportAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsString()
  @MinLength(5)
  @IsNotEmpty()
  reason: string;
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsString()
  @MinLength(5)
  @IsNotEmpty()
  reason: string;
}
