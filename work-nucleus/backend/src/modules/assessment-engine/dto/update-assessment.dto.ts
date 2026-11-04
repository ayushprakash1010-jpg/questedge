import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAssessmentDto } from './create-assessment.dto';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

