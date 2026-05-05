import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  hikePoolINR!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  bonusPoolINR!: number;

  @ApiPropertyOptional({
    description: 'Per-scope splits: [{ scope: { department, level }, hikeINR, bonusINR }]',
  })
  @IsOptional()
  @IsArray()
  splits?: Array<{ scope: Record<string, string>; hikeINR: number; bonusINR: number }>;

  @ApiProperty({ description: 'ratingToHikePercent: { "5": 15, "4": 10, ... }' })
  @IsObject()
  matrix!: Record<string, number>;

  @ApiProperty({ description: 'ratingToBonusMonths: { "5": 2, "4": 1, ... }' })
  @IsObject()
  bonusMatrix!: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Per-scope adjustment: [{ scope, adjustmentPercent, reason }]',
  })
  @IsOptional()
  @IsArray()
  marketCorrection?: Array<{ scope: Record<string, string>; adjustmentPercent: number; reason: string }>;

  @ApiPropertyOptional({
    description: 'Retention bumps by tier: [{ riskTier, additionalPercent }]',
  })
  @IsOptional()
  @IsArray()
  retentionRules?: Array<{ riskTier: string; additionalPercent: number }>;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hikeCapPct?: number;
}

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
