import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { TrainingCategory } from '@prisma/client';

export class CreateTrainingModuleDto {
  @IsString()
  title: string;

  @IsString()
  contentMarkdown: string;

  @IsEnum(TrainingCategory)
  category: TrainingCategory;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

export class UpdateTrainingModuleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsEnum(TrainingCategory)
  category?: TrainingCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}
