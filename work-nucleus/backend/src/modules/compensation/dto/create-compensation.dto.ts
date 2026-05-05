import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCompensationDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  fixedAnnual!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  variableAnnual?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  joiningBonus?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retentionBonus?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  esopUnits?: number;

  @ApiPropertyOptional({ description: '{ years, cliffMonths, schedule }' })
  @IsOptional()
  @IsObject()
  esopVesting?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '{ basic, hra, special, pf, gratuity, lta, ... }' })
  @IsOptional()
  @IsObject()
  breakup?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
