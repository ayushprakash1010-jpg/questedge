import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpsertCandidateProfileDto {
  @ApiProperty({ example: 'Rahul Verma' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senior Full-Stack Developer | 6 Years | React + Node.js' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsOptional()
  @IsString()
  currentCompany?: string;

  @ApiPropertyOptional({ example: 'Staff Engineer' })
  @IsOptional()
  @IsString()
  currentDesignation?: string;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Skill names array', example: ['React', 'TypeScript', 'Node.js'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Education history as JSON array' })
  @IsOptional()
  @IsArray()
  education?: any[];

  @ApiPropertyOptional({ description: 'Certifications array' })
  @IsOptional()
  @IsArray()
  certifications?: any[];

  @ApiPropertyOptional({ example: 'Bengaluru, India' })
  @IsOptional()
  @IsString()
  currentLocation?: string;

  @ApiPropertyOptional({ example: ['Bengaluru', 'Remote'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional({ description: 'Current CTC in base currency units', example: 1800000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentCtc?: number;

  @ApiPropertyOptional({ description: 'Expected CTC', example: 2200000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  expectedCtc?: number;

  @ApiPropertyOptional({ description: 'Notice period in days', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  noticePeriodDays?: number;

  @ApiPropertyOptional({ example: ['Backend Engineer', 'Full Stack Developer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoles?: string[];

  @ApiPropertyOptional({ example: ['SaaS', 'FinTech'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIndustries?: string[];

  @ApiPropertyOptional({ enum: ['Remote', 'Hybrid', 'On-site'] })
  @IsOptional()
  @IsString()
  workModel?: string;

  @ApiPropertyOptional({ description: 'Social/portfolio links as JSON object' })
  @IsOptional()
  profileLinks?: Record<string, string>;
}

export class DirectApplyDto {
  @ApiPropertyOptional({ description: 'Optional cover letter for this application' })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}

export class ConsentResponseDto {
  @ApiProperty({ description: 'Accept (true) or decline (false) the referral' })
  @IsBoolean()
  accepted: boolean;
}
