import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BgvCheckType } from '@prisma/client';

export class InitiateBgvDto {
  @ApiProperty()
  @IsUUID()
  candidateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  offerId?: string;

  @ApiProperty({ enum: BgvCheckType, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(BgvCheckType, { each: true })
  checkTypes!: BgvCheckType[];

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  retentionDays?: number;
}
