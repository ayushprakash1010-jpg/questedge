import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CycleType } from '@prisma/client';

export class CreateAppraisalCycleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: CycleType })
  @IsEnum(CycleType)
  type!: CycleType;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  goalSettingDeadline!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  selfAssessmentDeadline!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  managerReviewDeadline!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  calibrationDeadline!: Date;

  @ApiProperty({ description: 'e.g. [{ value: 5, label: "Outstanding" }, ...]' })
  @IsArray()
  ratingScale!: Array<{ value: number; label: string }>;

  @ApiPropertyOptional({ description: 'e.g. { goals: 60, competencies: 30, values: 10 }' })
  @IsOptional()
  @IsObject()
  weights?: Record<string, number>;

  @ApiPropertyOptional({ description: '{ minTenureMonths, departments, levels }' })
  @IsOptional()
  @IsObject()
  eligibilityRules?: Record<string, unknown>;
}
