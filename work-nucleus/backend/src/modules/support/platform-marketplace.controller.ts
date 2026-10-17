import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Req,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role, MandateStatus } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PlatformMarketplaceService } from './platform-marketplace.service';

@ApiTags('Platform Marketplace (Support Admin)')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support')
export class PlatformMarketplaceController {
  constructor(private readonly svc: PlatformMarketplaceService) {}

  // ── Mandates ────────────────────────────────────────────────────

  @Get('mandates')
  @ApiOperation({ summary: 'Platform: All mandates across all orgs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: MandateStatus })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'search', required: false })
  listMandates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: MandateStatus,
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listMandates({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      orgId,
      search,
    });
  }

  @Get('mandates/:mandateId')
  @ApiOperation({ summary: 'Platform: Mandate detail with participations' })
  getMandateDetail(@Param('mandateId', ParseUUIDPipe) mandateId: string) {
    return this.svc.getMandateDetail(mandateId);
  }

  // ── Recruiters ──────────────────────────────────────────────────

  @Get('recruiters')
  @ApiOperation({ summary: 'Platform: All recruiter profiles' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isVerified', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  listRecruiters(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isVerified') isVerified?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listRecruiters({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('recruiters/:recruiterId')
  @ApiOperation({
    summary: 'Platform: Recruiter detail with rewards and referrals',
  })
  getRecruiterDetail(@Param('recruiterId', ParseUUIDPipe) recruiterId: string) {
    return this.svc.getRecruiterDetail(recruiterId);
  }

  @Patch('recruiters/:recruiterId/verify')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Platform: Verify a recruiter profile (SUPPORT_ADMIN only)',
  })
  verifyRecruiter(
    @Param('recruiterId', ParseUUIDPipe) recruiterId: string,
    @Req() req: any,
  ) {
    return this.svc.verifyRecruiter(recruiterId, req.user.id);
  }

  @Patch('recruiters/:recruiterId/deactivate')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Platform: Deactivate a recruiter profile (SUPPORT_ADMIN only)',
  })
  deactivateRecruiter(
    @Param('recruiterId', ParseUUIDPipe) recruiterId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    if (!body.reason || body.reason.trim().length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }
    return this.svc.deactivateRecruiter(recruiterId, req.user.id, body.reason);
  }

  // ── Rewards ─────────────────────────────────────────────────────

  @Get('rewards')
  @ApiOperation({ summary: 'Platform: All reward tracking entries' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'recruiterId', required: false })
  listRewards(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
    @Query('recruiterId') recruiterId?: string,
    @Req() req?: any,
  ) {
    const isAdmin = req?.user?.role === Role.SUPPORT_ADMIN;
    return this.svc.listRewards({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      orgId,
      recruiterId,
      isAdmin,
    });
  }

  // ── Claim Scopes ────────────────────────────────────────────────

  @Get('claim-scopes')
  @ApiOperation({
    summary: 'Platform: Ownership/claim scope view for dispute investigation',
  })
  listClaimScopes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orgId') orgId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listClaimScopes({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      orgId,
      status,
    });
  }
}
