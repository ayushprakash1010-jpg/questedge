import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GoalType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGoalDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
  managerId!: string;

  @ApiProperty({ enum: GoalType })
  @IsEnum(GoalType)
  type!: GoalType;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metrics?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  weight!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  alignedToOrgGoalId?: string;
}

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  selfRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  managerRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerComment?: string;
}

export class CreateOrgGoalDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metric?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
