import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProvisionDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  orgName: string;

  @ApiPropertyOptional({ description: 'Organization industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({ description: 'User display name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
