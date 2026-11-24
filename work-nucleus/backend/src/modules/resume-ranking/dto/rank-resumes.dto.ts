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
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EVIDENCE_CREDIT } from '../ranking-policy';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';

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
  logisticsAvailability?: number; // Legacy input accepted. Location rules carry zero scoring points.
}

export class ShortlistingRulesDto {
  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  locationCompatibility?: string;

  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  mandatorySkills?: string;

  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  minimumExperience?: string;

  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  seniorityLevel?: string;

  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  requiredEducation?: string;

  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  requiredCertification?: string;

  @ApiPropertyOptional({ enum: ['REQUIRED', 'RELAXED'], default: 'RELAXED' })
  @IsOptional()
  @IsIn(['REQUIRED', 'RELAXED'])
  workAuthorization?: string;
}

export class RankResumesDto {
  @IsUUID()
  confirmedScorecardId?: string;

  @ApiProperty({ description: 'Mandate UUID to rank candidates against' })
  @IsUUID()
  mandateId: string;

  @ApiProperty({
    description:
      'Array of candidate IDs (from Candidate or CandidateProfile table)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  candidateIds: string[];

  @ApiPropertyOptional({
    description: 'Custom scoring weights (must sum to 100)',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  customWeights?: ScoringWeightsDto;

  @ApiPropertyOptional({
    description: 'Shortlisting knockout rules (Required vs Relaxed)',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ShortlistingRulesDto)
  shortlistingRules?: ShortlistingRulesDto;
}

export class ReRankDto {
  @IsUUID()
  confirmedScorecardId?: string;
  @ApiProperty({ description: 'Custom scoring weights for re-ranking' })
  @IsObject()
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  customWeights: ScoringWeightsDto;
}

export class RankingCorrectionDto {
  @IsIn(['QUICK', 'MANDATE'])
  source: 'QUICK' | 'MANDATE';
  @IsUUID()
  recordId: string;
  @IsString()
  @IsNotEmpty()
  candidateId: string;
  @IsString()
  @IsNotEmpty()
  requirementId: string;
  @IsIn(Object.keys(EVIDENCE_CREDIT))
  finding: string;
}

export class QuickRankResumeDto {
  @ApiPropertyOptional({ description: 'Stable unique ID from client' })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiProperty({
    description: 'Resume text content (from uploaded file or pasted)',
  })
  @IsString()
  @IsNotEmpty()
  resumeText: string;

  @ApiPropertyOptional({ description: 'Candidate name (optional)' })
  @IsOptional()
  @IsString()
  candidateName?: string;

  @ApiPropertyOptional({ description: 'Current job title or designation' })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiPropertyOptional({ description: 'Current or most recent company' })
  @IsOptional()
  @IsString()
  currentCompany?: string;

  @ApiPropertyOptional({ description: 'Total years of experience' })
  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Education qualification' })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({ description: 'Key skills array', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

export class QuickRankDto {
  @IsUUID()
  confirmedScorecardId?: string;

  @IsOptional()
  @IsUUID()
  clientRunId?: string;

  @ApiProperty({ description: 'Job description text' })
  @IsString()
  @IsNotEmpty()
  jdText: string;

  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Work model (Remote, Hybrid, Onsite)' })
  @IsOptional()
  @IsString()
  workModel?: string;

  @ApiPropertyOptional({ description: 'Experience required (e.g. 4-7 years)' })
  @IsOptional()
  @IsString()
  requiredExperience?: string;

  @ApiPropertyOptional({ description: 'Education requirement (e.g. B.Tech)' })
  @IsOptional()
  @IsString()
  educationRequirement?: string;

  @ApiPropertyOptional({ description: 'Mandatory skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mandatorySkills?: string[];

  @ApiPropertyOptional({ description: 'Preferred skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @ApiPropertyOptional({ description: 'Employment type (e.g. Full-time)' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty({
    description: 'Array of resume objects with text content',
    type: [QuickRankResumeDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuickRankResumeDto)
  resumes: QuickRankResumeDto[];

  @ApiPropertyOptional({
    description: 'Custom scoring weights (must sum to 100)',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  customWeights?: ScoringWeightsDto;

  @ApiPropertyOptional({
    description: 'Shortlisting knockout rules (Required vs Relaxed)',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ShortlistingRulesDto)
  shortlistingRules?: ShortlistingRulesDto;
}

export class DraftScorecardDto extends PartialType(
  OmitType(QuickRankDto, [
    'resumes',
    'clientRunId',
    'confirmedScorecardId',
  ] as const),
) {
  @IsOptional()
  @IsUUID()
  mandateId?: string;
}
