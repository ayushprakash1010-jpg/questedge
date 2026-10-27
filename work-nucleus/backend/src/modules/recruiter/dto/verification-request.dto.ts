import {
  IsString,
  IsOptional,
  IsUrl,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * P4-01: Recruiter Verification Application DTO.
 * Recruiters submit evidence for admin review to earn verification badges.
 */
export class CreateVerificationRequestDto {
  @ApiProperty({
    description: 'Brief statement of why the recruiter should be verified',
    example: '8+ years placing senior engineers across FAANG companies',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  statement: string;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL for identity verification',
    example: 'https://linkedin.com/in/priya-sharma-recruiter',
  })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({
    description: 'Employer / agency name for cross-referencing',
    example: 'Acme Talent Partners',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Professional certifications or notable achievements',
    example: ['AIRS Certified Recruiter', 'LinkedIn Recruiter Certified'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Links to portfolio, placements, or professional evidence',
    example: ['https://portfolio.example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}

export class ReviewVerificationDto {
  @ApiProperty({
    description: 'Admin decision on the verification request',
    enum: ['APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsString()
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Admin review notes / reason for decision',
    example: 'Verified LinkedIn profile and placement history.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
