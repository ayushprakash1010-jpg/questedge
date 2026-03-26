import { IsString, IsEnum, IsOptional, IsInt, IsArray, IsUUID, IsBoolean, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StageType } from '@prisma/client';

export class StageInterviewerDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class CreateStageDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: StageType })
  @IsEnum(StageType)
  stageType: StageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDurationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillsToEvaluate?: string[];

  @ApiPropertyOptional({ type: [StageInterviewerDto] })
  @IsOptional()
  @IsArray()
  @Type(() => StageInterviewerDto)
  interviewers?: StageInterviewerDto[];
}
