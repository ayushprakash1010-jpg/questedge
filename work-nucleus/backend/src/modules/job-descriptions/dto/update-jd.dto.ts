import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJdDto {
  @ApiPropertyOptional({ description: 'JD content JSON (title, summary, responsibilities, qualifications, aboutCompany, workMode)' })
  @IsOptional()
  content?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Fitment mapping JSON' })
  @IsOptional()
  fitmentMapping?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Evaluation parameters JSON' })
  @IsOptional()
  evaluationParameters?: Record<string, any>;
}
