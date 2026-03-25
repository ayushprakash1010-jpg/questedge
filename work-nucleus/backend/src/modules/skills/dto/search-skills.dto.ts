import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SkillCategory } from '@prisma/client';

export class SearchSkillsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: SkillCategory })
  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;
}
