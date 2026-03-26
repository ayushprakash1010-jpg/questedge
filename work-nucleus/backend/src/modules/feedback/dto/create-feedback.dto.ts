import { IsUUID, IsInt, IsEnum, IsString, IsOptional, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Recommendation } from '@prisma/client';

export class SkillRatingDto {
  @IsUUID()
  skillId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrUpdateFeedbackDto {
  @IsUUID()
  stageId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsEnum(Recommendation)
  recommendation: Recommendation;

  @IsOptional()
  @IsString()
  qualitativeNotes?: string;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  concerns?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillRatingDto)
  skillRatings?: SkillRatingDto[];
}
