import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillCategory } from '@prisma/client';

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: SkillCategory })
  @IsEnum(SkillCategory)
  category: SkillCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean = false;
}
