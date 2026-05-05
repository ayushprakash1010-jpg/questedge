import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class OverrideRevisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalHikePct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalHikeINR?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalBonusINR?: number;

  @ApiProperty()
  @IsString()
  overrideReason!: string;
}

export class ApprovalActionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class SimulateDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  overridePools?: { hikePoolINR?: number; bonusPoolINR?: number };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  overrideMatrix?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  overrideRatings?: Record<string, number>;
}
