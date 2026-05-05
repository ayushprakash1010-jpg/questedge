import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PeerRelationship } from '@prisma/client';

export class NominateOneDto {
  @ApiProperty()
  @IsUUID()
  reviewerUserId!: string;

  @ApiProperty({ enum: PeerRelationship })
  @IsEnum(PeerRelationship)
  relationship!: PeerRelationship;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class NominatePeersDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsUUID()
  subjectUserId!: string;

  @ApiProperty({ type: [NominateOneDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NominateOneDto)
  nominations!: NominateOneDto[];
}

export class SubmitPeerFeedbackDto {
  @ApiProperty()
  @IsObject()
  formData!: Record<string, unknown>;
}

export class DeclinePeerFeedbackDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}
