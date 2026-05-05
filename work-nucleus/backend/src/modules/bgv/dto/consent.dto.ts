import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class StartConsentDto {}

export class VerifyOtpDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  otp!: string;

  @ApiProperty()
  @IsString()
  signedName!: string;
}

export class OverrideFindingDto {
  @ApiProperty({ enum: ['CLEAR', 'DISCREPANCY', 'UNABLE_TO_VERIFY'] })
  @IsString()
  finding!: 'CLEAR' | 'DISCREPANCY' | 'UNABLE_TO_VERIFY';

  @ApiProperty()
  @IsString()
  @MinLength(5)
  justification!: string;
}
