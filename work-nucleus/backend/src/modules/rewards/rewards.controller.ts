import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType, Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import {
  RaiseRewardDisputeDto,
  ResolveRewardDisputeDto,
} from './dto/reward-dispute.dto';

@ApiTags('Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('company')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Get pending rewards and payouts' })
  async getCompanyRewards(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.rewardsService.getCompanyRewards(
      user.orgId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * P0-07: Restricted to ADMIN and HR only (was open to any COMPANY_USER including VIEWER).
   * Audit ref: H-10 / F-07 — unauthorised payout approvals.
   */
  @Post('company/:id/approve')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Company: Approve a reward payout (ADMIN/HR only)' })
  async approveReward(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rewardsService.approveReward(user.orgId, id);
  }

  // ── P0-07: GET /rewards/fix DELETED ──────────────────────────
  // Was a GET that mutated data across ALL tenants with invented amounts.
  // Audit ref: H-02 / F-16 — cross-tenant writes from a link click.
  // Keep the fixMissingRewards logic offline if ever needed.

  @Get('recruiter')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Get earnings dashboard data' })
  async getRecruiterRewards(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.rewardsService.getRecruiterRewards(
      user.auth0Sub,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
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

  // ── P4-05: Reward Disputes & Immutable Audit Trail ──────────────

  @Post(':id/dispute')
  @ApiOperation({
    summary:
      'Raise a formal dispute on a reward (Company ADMIN/HR or Recruiter)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async raiseDispute(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RaiseRewardDisputeDto,
  ) {
    return this.rewardsService.raiseDispute(
      id,
      {
        userId: user.id,
        orgId: user.orgId,
        auth0Sub: user.auth0Sub,
        userType: user.userType,
      },
      dto,
    );
  }

  @Post(':id/resolve-dispute')
  @Roles(Role.ADMIN, Role.HR, Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Resolve a disputed reward (Company ADMIN/HR or SUPPORT_ADMIN)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async resolveDispute(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveRewardDisputeDto,
  ) {
    return this.rewardsService.resolveDispute(
      id,
      {
        userId: user.id,
        orgId: user.orgId,
        role: user.role,
      },
      dto,
    );
  }

  @Get(':id/audit-trail')
  @ApiOperation({
    summary:
      'Get tamper-evident immutable audit trail & SHA-256 verification for a reward',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getRewardAuditTrail(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardsService.getRewardAuditTrail(id);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List all rewards currently under dispute' })
  async getDisputes(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const isCompany =
      user.userType === UserType.COMPANY_ADMIN ||
      user.userType === UserType.COMPANY_USER;
    const isRecruiter = user.userType === UserType.RECRUITER;

    return this.rewardsService.getDisputes({
      orgId: isCompany ? user.orgId : undefined,
      recruiterId: isRecruiter ? user.id : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}

