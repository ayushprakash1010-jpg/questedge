import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RecruiterService } from './recruiter.service';
import {
  CreateRecruiterProfileDto,
  UpdateRecruiterProfileDto,
} from './dto/recruiter-profile.dto';
import {
  CreateVerificationRequestDto,
  ReviewVerificationDto,
} from './dto/verification-request.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('Recruiter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/recruiter')
export class RecruiterController {
  constructor(private readonly recruiterService: RecruiterService) {}

  @Post('profile')
  @ApiOperation({
    summary: 'Recruiter: Create profile (called after first Auth0 login)',
  })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(
    @CurrentUser() user: any,
    @Body() dto: CreateRecruiterProfileDto,
  ) {
    return this.recruiterService.createProfile(user.auth0Sub, user.email, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Recruiter: Get own profile with stats' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.recruiterService.getMyProfile(user.id || user.auth0Sub);
  }

  @Patch('profile')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Update own profile' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateRecruiterProfileDto,
  ) {
    return this.recruiterService.updateProfile(user.id || user.auth0Sub, dto);
  }

  @Get('dashboard')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({
    summary:
      'Recruiter: Get full dashboard (earnings, referrals, active mandates)',
  })
  async getDashboard(@CurrentUser() user: any) {
    return this.recruiterService.getDashboard(user.id || user.auth0Sub);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Recruiter: Get global leaderboard' })
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.recruiterService.getLeaderboard(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ── P4-01: Verification Workflow & Trust Profile ─────────────────

  @Post('verification-request')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({
    summary: 'Recruiter: Submit verification application for trust badge',
  })
  async submitVerificationRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateVerificationRequestDto,
  ) {
    return this.recruiterService.submitVerificationRequest(user.id || user.auth0Sub, dto);
  }

  @Get('trust-profile')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({
    summary: 'Recruiter: Get own trust profile with score & tier breakdown',
  })
  async getMyTrustProfile(@CurrentUser() user: any) {
    return this.recruiterService.getTrustProfile(user.id || user.auth0Sub);
  }

  @Get('verification/queue')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Support Admin: Get verification review queue',
  })
  async getVerificationQueue(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.recruiterService.getVerificationQueue(
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Patch(':id/verify-decision')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Support Admin: Approve or reject recruiter verification',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async reviewVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.recruiterService.reviewVerification(
      id,
      dto.decision,
      dto.adminNotes,
    );
  }

  @Get(':id/trust-profile')
  @ApiOperation({
    summary: 'Public/Company: View recruiter trust profile and score breakdown',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getRecruiterTrustProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruiterService.getTrustProfile(id);
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Public: View a recruiter public profile' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruiterService.getPublicProfile(id);
  }
}
