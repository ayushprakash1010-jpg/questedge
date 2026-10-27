import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DisputeReason {
  OWNERSHIP_CONFLICT = 'OWNERSHIP_CONFLICT',
  CLAWBACK_EARLY_EXIT = 'CLAWBACK_EARLY_EXIT',
  SALARY_MISMATCH = 'SALARY_MISMATCH',
  FRAUDULENT_SUBMISSION = 'FRAUDULENT_SUBMISSION',
  OTHER = 'OTHER',
}

export enum DisputeDecision {
  UPHELD = 'UPHELD',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
}

/**
 * P4-05: DTO to raise a formal dispute against a referral reward.
 */
export class RaiseRewardDisputeDto {
  @ApiProperty({
    description: 'Category / reason for disputing this referral reward',
    enum: DisputeReason,
    example: DisputeReason.CLAWBACK_EARLY_EXIT,
  })
  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @ApiProperty({
    description: 'Detailed explanation and background for why this dispute is raised',
    example: 'Candidate resigned on day 42, which is well within the 90-day clawback retention guarantee.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  details: string;

  @ApiPropertyOptional({
    description: 'Supporting documents, resignation letters, or ownership evidence URLs',
    example: ['https://storage.example.com/resignation-letter.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}

/**
 * P4-05: DTO for admin or mediator to resolve a disputed reward.
 */
export class ResolveRewardDisputeDto {
  @ApiProperty({
    description: 'Resolution decision: UPHELD (clawback/cancel), REJECTED (restore payout), or SETTLED (custom amount)',
    enum: DisputeDecision,
    example: DisputeDecision.UPHELD,
  })
  @IsEnum(DisputeDecision)
  decision: DisputeDecision;

  @ApiProperty({
    description: 'Official mediation rationale and notes regarding the resolution',
    example: 'Verified with HR that candidate departed within guarantee period. Dispute upheld and reward cancelled.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  resolutionNotes: string;

  @ApiPropertyOptional({
    description: 'If decision is SETTLED, the agreed prorated or revised reward amount in INR',
    example: 15000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  settlementAmount?: number;
}
