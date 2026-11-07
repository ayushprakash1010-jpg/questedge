import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchExternalJobsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  workplaceType?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  postedWithin?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

