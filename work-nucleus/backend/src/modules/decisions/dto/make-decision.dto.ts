import { IsEnum, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { DecisionType } from '@prisma/client';

export class MakeDecisionDto {
  @IsEnum(DecisionType)
  decision: DecisionType;

  @IsOptional()
  @IsString()
  decisionNotes?: string;

  @IsOptional()
  @IsNumber()
  offerCtc?: number;

  @IsOptional()
  @IsString()
  offerDesignation?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;
}

export class UpdateCommunicationDto {
  @IsString()
  subject: string;

  @IsString()
  body: string;
}
