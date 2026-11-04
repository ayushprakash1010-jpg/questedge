import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HiringAssessmentType } from '@prisma/client';

export class CreateAssessmentDto {
  @ApiProperty({ example: 'JavaScript Fundamentals Quiz' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'Test your JavaScript knowledge' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: HiringAssessmentType, example: 'QUIZ' })
  @IsEnum(HiringAssessmentType)
  type: HiringAssessmentType;

  @ApiProperty({ example: 30, description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutes: number;

  @ApiPropertyOptional({ example: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalPoints?: number;

  @ApiPropertyOptional({ example: 60, description: 'Passing percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  passingPercentage?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  showResults?: boolean;

  @ApiPropertyOptional({ description: 'Markdown instructions shown before start' })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Link to a specific mandate' })
  @IsUUID()
  @IsOptional()
  mandateId?: string;

  @ApiPropertyOptional({ description: 'Link to a specific pipeline stage' })
  @IsUUID()
  @IsOptional()
  pipelineStageId?: string;
}

