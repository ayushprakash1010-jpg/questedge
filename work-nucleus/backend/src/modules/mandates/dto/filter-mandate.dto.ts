import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MandateStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class FilterMandateDto {
  @ApiPropertyOptional({ description: 'Full-text search across title and description' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by location (partial match)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by department (partial match)' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by industry (partial match)' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ enum: ['Remote', 'Hybrid', 'On-site'] })
  @IsOptional()
  @IsString()
  workModel?: string;

  @ApiPropertyOptional({ description: 'Comma-separated skill names', example: 'Node.js,TypeScript' })
  @IsOptional()
  @IsString()
  skills?: string;

  @ApiPropertyOptional({ enum: MandateStatus })
  @IsOptional()
  @IsEnum(MandateStatus)
  status?: MandateStatus;

  @ApiPropertyOptional({ description: 'Minimum reward amount filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minReward?: number;

  @ApiPropertyOptional({ description: 'Maximum reward amount filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxReward?: number;

  @ApiPropertyOptional({ description: 'Employment type', example: 'Full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'publishedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
