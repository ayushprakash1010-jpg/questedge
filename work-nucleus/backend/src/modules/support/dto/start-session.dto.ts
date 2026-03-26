import { IsString, IsOptional, IsUUID } from 'class-validator';

export class StartSessionDto {
  @IsUUID()
  targetOrgId: string;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsString()
  reason: string;
}
