import { IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateVariableDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ description: 'string | number | date | currency' })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  default?: unknown;
}

export class CreateOfferTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Handlebars template with {{variables}}' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ type: [TemplateVariableDto] })
  @IsOptional()
  @IsArray()
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  brandingJson?: Record<string, unknown>;
}
