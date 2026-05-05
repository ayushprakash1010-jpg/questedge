import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CreateCompensationDto } from '../../compensation/dto/create-compensation.dto';

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  applicationId!: string;

  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiPropertyOptional({ description: 'Inline compensation; if omitted, supply compensationId' })
  @IsOptional()
  @Type(() => CreateCompensationDto)
  compensation?: CreateCompensationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  compensationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Approver chain: [{ role, userId? }] (in order)' })
  @IsOptional()
  @IsObject({ each: true })
  approverChain?: Array<{ role: string; userId?: string }>;

  @ApiPropertyOptional({ description: 'Free-text body content from AI drafter merged into template' })
  @IsOptional()
  @IsString()
  draftBody?: string;
}
