import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentType } from '@prisma/client';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class StartAssessmentDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
  managerId!: string;

  @ApiProperty({ enum: AssessmentType })
  @IsEnum(AssessmentType)
  type!: AssessmentType;
}

export class AutosaveAssessmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  competencyRatings?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerSummary?: string;
}

export class FinaliseAssessmentDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(5)
  finalRating!: number;

  @ApiProperty()
  @IsString()
  ratingLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerSummary?: string;
}
