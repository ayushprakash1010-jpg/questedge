import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ApproveOfferDto {
  @ApiProperty({ enum: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] })
  @IsIn(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'])
  decision!: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
