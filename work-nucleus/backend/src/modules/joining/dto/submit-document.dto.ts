import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitDocumentDto {
  @ApiProperty()
  @IsString()
  itemKey!: string;

  @ApiProperty({ description: 'S3 key produced by the upload presign step' })
  @IsString()
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewDocumentDto {
  @ApiProperty()
  @IsString()
  itemKey!: string;

  @ApiProperty({ enum: ['APPROVED', 'NEEDS_REVISION'] })
  @IsIn(['APPROVED', 'NEEDS_REVISION'])
  decision!: 'APPROVED' | 'NEEDS_REVISION';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
