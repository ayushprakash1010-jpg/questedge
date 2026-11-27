import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptOfferDto {
  @ApiProperty({ description: 'Full legal name typed as electronic signature' })
  @IsString()
  @MinLength(2)
  signerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  agreedToTerms?: boolean;
}

export class DeclineOfferDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class NegotiateOfferDto {
  @ApiProperty()
  @IsString()
  comment!: string;

  @ApiPropertyOptional({
    description: 'Counter-proposal compensation deltas (free-form JSON)',
  })
  @IsOptional()
  counter?: Record<string, unknown>;
}
