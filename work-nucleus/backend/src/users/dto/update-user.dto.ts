import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * Roles that a tenant admin is allowed to assign within their organisation.
 * Platform-level roles (SUPPORT_REP, SUPPORT_ADMIN) must be provisioned
 * through a separate, audited process — never via the admin user API.
 *
 * Audit ref: C-01 / F-01 — privilege escalation fix.
 */
export const TENANT_ASSIGNABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.HR,
  Role.HIRING_MANAGER,
  Role.INTERVIEWER,
  Role.VIEWER,
];

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    enum: TENANT_ASSIGNABLE_ROLES,
    description: 'User role (tenant-level only — SUPPORT_* roles are rejected)',
  })
  @IsIn(TENANT_ASSIGNABLE_ROLES, {
    message:
      'Role must be one of: ADMIN, HR, HIRING_MANAGER, INTERVIEWER, VIEWER',
  })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ description: 'Whether the user is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
