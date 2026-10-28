import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HireDetectionService } from './hire-detection.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StatusCheckResponse, Role } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// ── DTOs ─────────────────────────────────────────────────────────

export class CandidateStatusResponseDto {
  @IsEnum(StatusCheckResponse)
  @IsNotEmpty()
  response: StatusCheckResponse;

  @IsOptional()
  @IsString()
  responseDetails?: string;
}

export class ResolveBypassFlagDto {
  @IsString()
  @IsNotEmpty()
  resolution: string; // CONFIRMED_HIRE | FALSE_POSITIVE | UNDER_REVIEW

  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class ConfirmReferralStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string; // HIRED | REJECTED | IN_PROCESS

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Controller ───────────────────────────────────────────────────

@Controller('api/v1')
export class HireDetectionController {
  constructor(private readonly hireDetection: HireDetectionService) {}

  // ── Public: Candidate responds to status check (token-based) ──

  @Public()
  @Get('candidate-status-check/:token')
  async getStatusCheck(@Param('token') token: string) {
    return this.hireDetection.getStatusCheckByToken(token);
  }

  @Public()
  @Post('candidate-status-check/:token/respond')
  @HttpCode(HttpStatus.OK)
  async respondToStatusCheck(
    @Param('token') token: string,
    @Body() dto: CandidateStatusResponseDto,
  ) {
    return this.hireDetection.processCandidateResponse(
      token,
      dto.response,
      dto.responseDetails,
    );
  }

  // ── Company: Confirm referral hire status ──────────────────────

  @Roles(Role.ADMIN, Role.HR)
  @Post('mandates/:mandateId/referrals/:referralId/confirm-status')
  @HttpCode(HttpStatus.OK)
  async confirmReferralStatus(
    @CurrentUser() user: any,
    @Param('mandateId') mandateId: string,
    @Param('referralId') referralId: string,
    @Body() dto: ConfirmReferralStatusDto,
  ) {
    return this.hireDetection.confirmReferralStatus(
      user.orgId,
      mandateId,
      referralId,
      dto.status,
      dto.notes,
    );
  }

  // ── Company: View own trust score ──────────────────────────────

  @Roles(Role.ADMIN, Role.HR)
  @Get('trust-score')
  async getMyTrustScore(@CurrentUser() user: any) {
    return this.hireDetection.getTrustScore(user.orgId);
  }

  // ── Support Admin: Bypass flags dashboard ──────────────────────

  @Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN, Role.ADMIN)
  @Get(['bypass-flags', 'support/bypass-flags'])
  async getBypassFlags(
    @Query('orgId') orgId?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('isResolved') isResolved?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.hireDetection.getBypassFlags({
      orgId,
      riskLevel: riskLevel as any,
      isResolved: isResolved === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN, Role.ADMIN)
  @Get(['bypass-flags/stats', 'support/bypass-flags/stats'])
  async getBypassStats() {
    return this.hireDetection.getBypassStats();
  }

  @Roles(Role.SUPPORT_ADMIN)
  @Patch(['bypass-flags/:flagId/resolve', 'support/bypass-flags/:flagId/resolve'])
  async resolveBypassFlag(
    @CurrentUser() user: any,
    @Param('flagId') flagId: string,
    @Body() dto: ResolveBypassFlagDto,
  ) {
    return this.hireDetection.resolveBypassFlag(
      flagId,
      dto.resolution,
      dto.notes,
      user.id,
    );
  }

  // ── Support Admin: Trust scores ────────────────────────────────

  @Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
  @Get(['trust-scores', 'support/trust-scores'])
  async getAllTrustScores(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.hireDetection.getAllTrustScores(
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  // ── Support Admin: Manual scan trigger ─────────────────────────

  @Roles(Role.SUPPORT_ADMIN)
  @Post(['bypass-detection/run-scan', 'support/bypass-flags/scan'])
  @HttpCode(HttpStatus.OK)
  async triggerManualScan() {
    const [scan, confirm, checkins, trust] = await Promise.all([
      this.hireDetection.runStaleReferralScan(),
      this.hireDetection.runHireConfirmationChecks(),
      this.hireDetection.runCandidateCheckIns(),
      this.hireDetection.recalculateTrustScores(),
    ]);

    return {
      staleReferralScan: scan,
      hireConfirmation: confirm,
      candidateCheckIns: checkins,
      trustScores: trust,
    };
  }
}
