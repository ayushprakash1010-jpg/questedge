import {
  IsString,
  MinLength,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillPriority } from '@prisma/client';

export class HiringPlanSkillDto {
  @ApiProperty()
  @IsUUID()
  skillId: string;

  @ApiProperty({ enum: SkillPriority })
  @IsEnum(SkillPriority)
  priority: SkillPriority;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  minProficiency: number;
}

export class CreateHiringPlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty()
  @IsString()
  industry: string;

  @ApiProperty()
  @IsString()
  department: string;

  @ApiProperty()
  @IsString()
  designation: string;

  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number;

  @ApiProperty()
  @IsInt()
  year: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  totalRoles: number;

  @ApiProperty()
  @IsNumber()
  budgetMin: number;

  @ApiProperty()
  @IsNumber()
  budgetMax: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiProperty()
  @IsUUID()
  hiringManagerId: string;

  @ApiProperty()
  @IsString()
  reportingManagerName: string;

  @ApiProperty()
  @IsString()
  hodName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  teamSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamLevels?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [HiringPlanSkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HiringPlanSkillDto)
  skills?: HiringPlanSkillDto[];
}
