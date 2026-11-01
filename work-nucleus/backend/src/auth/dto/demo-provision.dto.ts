import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DemoProvisionDto {
  @ApiProperty({ description: 'Organization name', example: 'QuestEdge Demo Corp' })
  @IsString()
  @IsNotEmpty()
  orgName: string;

  @ApiPropertyOptional({ description: 'Organization industry', example: 'Technology' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({ description: 'Display name for demo user', example: 'Demo Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Email (fallback if not in JWT)', example: 'demo@questedge.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}

