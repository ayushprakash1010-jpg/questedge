import {
  IsUUID,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class PreflightCheckDto {
  @IsUUID()
  mandateId: string;

  @IsOptional()
  @IsUUID()
  candidateProfileId?: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsString()
  candidateEmail?: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedCtc?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  noticePeriodDays?: number;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsString()
  workModel?: string;
}
