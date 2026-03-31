import { IsOptional, IsString, IsEnum, IsInt, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CandidateSource } from '@prisma/client';

export class QueryCandidatesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: CandidateSource })
  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;

  @ApiPropertyOptional({ description: 'Filter by hiring plan ID' })
  @IsOptional()
  @IsString()
  hiringPlanId?: string;

  @ApiPropertyOptional({ description: 'Top N candidates by AI match score', enum: [5, 10, 20] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([5, 10, 20])
  topN?: number;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['createdAt', 'aiMatchScore', 'name'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
