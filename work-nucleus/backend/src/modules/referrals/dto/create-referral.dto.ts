import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiProperty({ description: 'The ID of the mandate being referred to' })
  @IsUUID()
  @IsNotEmpty()
  mandateId: string;

  @ApiProperty({ description: 'Candidate email address' })
  @IsEmail()
  @IsNotEmpty()
  candidateEmail: string;

  @ApiProperty({ description: 'Candidate full name' })
  @IsString()
  @IsNotEmpty()
  candidateName: string;

  @ApiPropertyOptional({ description: 'Candidate phone number' })
  @IsString()
  @IsOptional()
  candidatePhone?: string;

  @ApiPropertyOptional({ description: 'Pitch note from the recruiter to the candidate' })
  @IsString()
  @IsOptional()
  recruiterNote?: string;
}
