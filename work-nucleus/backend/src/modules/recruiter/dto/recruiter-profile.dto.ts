import { IsArray, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRecruiterProfileDto {
  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senior Technical Recruiter | 8+ years | SaaS & FinTech' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ description: 'Industries/roles recruiter specializes in', example: ['Software Engineering', 'FinTech'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ description: 'Professional bio or about section' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Link to portfolio or past placements' })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Total years of recruiting experience' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;
}

export class UpdateRecruiterProfileDto extends CreateRecruiterProfileDto {}
