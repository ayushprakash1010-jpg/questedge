import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ReportSource, ReportVisualization } from '@prisma/client';
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReportDefinitionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ReportSource })
  @IsEnum(ReportSource)
  dataSource!: ReportSource;

  @ApiPropertyOptional({ description: '[{ field, op, value }]' })
  @IsOptional()
  @IsArray()
  filters?: Array<{ field: string; op: string; value: unknown }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  groupBy?: string[];

  @ApiPropertyOptional({ description: '[{ field, agg }]' })
  @IsOptional()
  @IsArray()
  metrics?: Array<{ field: string; agg: string }>;

  @ApiPropertyOptional({ enum: ReportVisualization })
  @IsOptional()
  @IsEnum(ReportVisualization)
  visualization?: ReportVisualization;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  scheduleTargets?: Record<string, unknown>;
}

export class UpdateReportDefinitionDto extends PartialType(CreateReportDefinitionDto) {}

export class NaturalLanguageReportDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  prompt!: string;
}
