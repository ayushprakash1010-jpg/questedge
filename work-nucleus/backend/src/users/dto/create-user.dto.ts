import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TENANT_ASSIGNABLE_ROLES } from './update-user.dto';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: TENANT_ASSIGNABLE_ROLES,
    description: 'User role (tenant-level only — SUPPORT_* roles are rejected)',
  })
  @IsIn(TENANT_ASSIGNABLE_ROLES, {
    message:
      'Role must be one of: ADMIN, HR, HIRING_MANAGER, INTERVIEWER, VIEWER',
  })
  role: Role;
}
