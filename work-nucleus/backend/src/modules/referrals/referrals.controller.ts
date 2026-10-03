import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserTypes } from '../../auth/decorators/user-types.decorator';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @UserTypes('RECRUITER')
  @ApiOperation({ summary: 'Submit a new referral (Recruiter only)' })
  @ApiResponse({ status: 201, description: 'Referral submitted and consent requested.' })
  @ApiResponse({ status: 409, description: 'Candidate already locked.' })
  create(@Req() req: any, @Body() createReferralDto: CreateReferralDto) {
    return this.referralsService.createReferral(req.user.id, createReferralDto);
  }

  @Get('my')
  @UserTypes('RECRUITER')
  @ApiOperation({ summary: 'Get all referrals submitted by the current recruiter' })
  @ApiResponse({ status: 200, description: 'List of referrals returned.' })
  getMyReferrals(@Req() req: any) {
    return this.referralsService.getMyReferrals(req.user.id);
  }
}
