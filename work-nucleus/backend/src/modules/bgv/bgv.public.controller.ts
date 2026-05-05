import { Body, Controller, Get, Ip, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { BgvService } from './bgv.service';
import { VerifyOtpDto } from './dto/consent.dto';

@ApiTags('Public BGV Consent (v2)')
@Public()
@Controller('api/v2/public/bgv/consent')
export class BgvPublicController {
  constructor(private readonly service: BgvService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get BGV consent context (scope, vendor, retention)' })
  get(@Param('token') token: string) {
    return this.service.findByConsentToken(token);
  }

  @Post(':token/start')
  @ApiOperation({ summary: 'Send OTP to candidate phone/email to begin consent' })
  start(@Param('token') token: string, @Ip() ip: string) {
    return this.service.startConsent(token, ip);
  }

  @Post(':token/verify')
  @ApiOperation({ summary: 'Submit OTP + signed name → records consent and starts checks' })
  verify(@Param('token') token: string, @Body() dto: VerifyOtpDto, @Ip() ip: string) {
    return this.service.verifyConsent(token, dto.otp, dto.signedName, ip);
  }
}
