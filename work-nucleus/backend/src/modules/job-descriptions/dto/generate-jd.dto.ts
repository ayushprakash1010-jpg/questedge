import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateJdDto {
  @ApiPropertyOptional({ description: 'Additional context for AI generation' })
  @IsOptional()
  @IsString()
  additionalContext?: string;
}
