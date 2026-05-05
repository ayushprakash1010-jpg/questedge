import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Counter-proposal compensation deltas (free-form JSON)' })
  @IsOptional()
  counter?: Record<string, unknown>;
}
