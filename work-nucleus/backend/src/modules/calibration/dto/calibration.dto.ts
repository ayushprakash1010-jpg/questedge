import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCalibrationSessionDto {
  @ApiProperty()
  @IsUUID()
  cycleId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  groupName!: string;

  @ApiProperty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantUserIds!: string[];

  @ApiProperty()
  @IsObject()
  scope!: { departments?: string[]; levels?: string[]; locations?: string[] };

  @ApiProperty({ description: 'Target % per rating bucket: { "5": 10, "4": 25, ... }' })
  @IsObject()
  targetDistribution!: Record<string, number>;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;
}

export class MoveAssessmentDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: 'New rating value, must exist in cycle ratingScale' })
  newRating!: number;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;
}
