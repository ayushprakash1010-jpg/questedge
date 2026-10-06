import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MandateParticipationType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class CreateMandateDto {
  @ApiProperty({ description: 'Job title', example: 'Senior Backend Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Department', example: 'Engineering' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Full job description (markdown supported)' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: '5-8 years' })
  @IsOptional()
  @IsString()
  requiredExperience?: string;

  @ApiProperty({ description: 'Mandatory skills list', example: ['Node.js', 'PostgreSQL'] })
  @IsArray()
  @IsString({ each: true })
  mandatorySkills: string[];

  @ApiPropertyOptional({ description: 'Nice-to-have skills', example: ['Redis', 'Docker'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  numberOfOpenings?: number;

  @ApiPropertyOptional({ example: 'Bangalore, India' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ['Remote', 'Hybrid', 'On-site'] })
  @IsOptional()
  @IsString()
  workModel?: string;

  @ApiPropertyOptional({ example: 'Full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ description: 'Minimum compensation', example: 1500000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  compensationMin?: number;

  @ApiPropertyOptional({ description: 'Maximum compensation', example: 2000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  compensationMax?: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  acceptsDirectApply?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  acceptsReferrals?: boolean;

  @ApiPropertyOptional({ enum: MandateParticipationType, default: 'OPEN' })
  @IsOptional()
  @IsEnum(MandateParticipationType)
  participationType?: MandateParticipationType;

  @ApiPropertyOptional({ description: 'Fixed referral reward amount', example: 50000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  referralRewardAmount?: number;

  @ApiPropertyOptional({ enum: ['FIXED', 'PERCENTAGE'], example: 'FIXED' })
  @IsOptional()
  @IsString()
  referralRewardType?: string;

  @ApiPropertyOptional({ description: 'Ownership lock duration in days', default: 180 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Type(() => Number)
  ownershipPeriodDays?: number;

  @ApiPropertyOptional({ description: 'Expected hiring timeline', example: '30 days' })
  @IsOptional()
  @IsString()
  expectedTimeline?: string;

  @ApiPropertyOptional({ description: 'Interview process description as JSON array', example: ['Phone Screen', 'Technical', 'Culture Fit'] })
  @IsOptional()
  @IsArray()
  interviewProcess?: string[];

  @ApiPropertyOptional({ description: 'Notice period preference', example: '30 days or less' })
  @IsOptional()
  @IsString()
  noticePeriodPref?: string;

  @ApiPropertyOptional({ description: 'Hiring Manager Name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  hiringManagerName?: string;

  @ApiPropertyOptional({ description: 'Hiring Manager Title', example: 'Engineering Lead' })
  @IsOptional()
  @IsString()
  hiringManagerTitle?: string;

  @ApiPropertyOptional({ description: 'Team Description', example: 'You will join a dynamic 5-person squad' })
  @IsOptional()
  @IsString()
  teamDescription?: string;
}
