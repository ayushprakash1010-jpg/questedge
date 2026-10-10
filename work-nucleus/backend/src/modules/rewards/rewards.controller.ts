import { Controller, Get, Post, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { UserType } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('company')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Get pending rewards and payouts' })
  async getCompanyRewards(@CurrentUser() user: any) {
    return this.rewardsService.getCompanyRewards(user.orgId);
  }

  @Post('company/:id/approve')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Approve a reward payout' })
  async approveReward(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rewardsService.approveReward(user.orgId, id);
  }

  @Get('recruiter')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Get earnings dashboard data' })
  async getRecruiterRewards(@CurrentUser() user: any) {
    return this.rewardsService.getRecruiterRewards(user.auth0Sub);
  }

  @Get('fix')
  @UserTypes(UserType.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Internal: Fix missing rewards (Admin only)' })
  async fixRewards() {
    return this.rewardsService.fixMissingRewards();
  }

  @Post('recruiter/:id/withdraw')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Withdraw an approved reward' })
  async withdrawReward(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rewardsService.withdrawReward(user.auth0Sub, id);
  }
}
