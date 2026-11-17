import {
  IsUUID,
  IsArray,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoringWeightsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  skillsMatch?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceRelevance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  projectRelevance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  educationCertifications?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  domainIndustryFit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  roleSeniorityFit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  culturalSoftSignals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  logisticsAvailability?: number;
}

export class RankResumesDto {
  @ApiProperty({ description: 'Mandate UUID to rank candidates against' })
  @IsUUID()
  mandateId: string;

  @ApiProperty({
    description: 'Array of candidate IDs (from Candidate or CandidateProfile table)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  candidateIds: string[];

  @ApiPropertyOptional({ description: 'Custom scoring weights (must sum to 100)' })
  @IsOptional()
  @IsObject()
  @Type(() => ScoringWeightsDto)
  customWeights?: ScoringWeightsDto;
}

export class ReRankDto {
  @ApiProperty({ description: 'Custom scoring weights for re-ranking' })
  @IsObject()
  @Type(() => ScoringWeightsDto)
  customWeights: ScoringWeightsDto;
}

export class QuickRankResumeDto {
  @ApiProperty({ description: 'Resume text content (from uploaded file or pasted)' })
  resumeText: string;

  @ApiPropertyOptional({ description: 'Candidate name (optional)' })
  @IsOptional()
  candidateName?: string;
}

export class QuickRankDto {
  @ApiProperty({ description: 'Job description text' })
  jdText: string;

  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Work model (Remote, Hybrid, Onsite)' })
  @IsOptional()
  workModel?: string;

  @ApiProperty({
    description: 'Array of resume objects with text content',
    type: [QuickRankResumeDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  resumes: QuickRankResumeDto[];

  @ApiPropertyOptional({ description: 'Custom scoring weights (must sum to 100)' })
  @IsOptional()
  @IsObject()
  @Type(() => ScoringWeightsDto)
  customWeights?: ScoringWeightsDto;
}
