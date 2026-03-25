import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncDto {
  @ApiProperty({ description: 'Auth0 user ID (sub claim)' })
  @IsString()
  auth0Sub: string;

  @ApiPropertyOptional({ description: 'Updated email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Updated name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated avatar URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
