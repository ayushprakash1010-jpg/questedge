import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Role, UserType } from '@prisma/client';
import { AiMatchingService } from './ai-matching.service';
import { PreflightCheckDto } from './dto/preflight-check.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('AI Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/ai-matching')
export class AiMatchingController {
  constructor(
    private readonly aiMatchingService: AiMatchingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('candidate/mandate/:mandateId')
  @UserTypes(UserType.CANDIDATE)
  @ApiOperation({ summary: 'Evaluate authenticated candidate profile against a job mandate' })
  @ApiParam({ name: 'mandateId', description: 'Mandate UUID' })
  async evaluateCandidateAgainstMandate(
    @CurrentUser() user: any,
    @Param('mandateId', ParseUUIDPipe) mandateId: string,
  ) {
    const sub = user.auth0Sub || user.sub;
    const email = user.email ? String(user.email).toLowerCase().trim() : '';

    const mandate = await this.prisma.mandate.findUnique({
      where: { id: mandateId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!mandate) {
      throw new NotFoundException(`Job mandate ${mandateId} not found`);
    }

    const candidate = await this.prisma.candidateProfile.findFirst({
      where: {
        OR: [
          ...(sub ? [{ auth0Sub: sub }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!candidate) {
      return this.aiMatchingService.evaluateCandidateAgainstMandate(
        {
          name: user.name || 'Candidate',
          headline: 'Talent Network Member',
          experienceYears: 3,
          skills: [],
        },
        mandate,
      );
    }

    return this.aiMatchingService.evaluateCandidateAgainstMandate(candidate, mandate);
  }

  @Get('candidate/recommendations')
  @UserTypes(UserType.CANDIDATE)
  @ApiOperation({ summary: 'Get personalized top matching job mandates for candidate' })
  async getCandidateRecommendations(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const sub = user.auth0Sub || user.sub;
    const email = user.email ? String(user.email).toLowerCase().trim() : '';

    let candidate = await this.prisma.candidateProfile.findFirst({
      where: {
        OR: [
          ...(sub ? [{ auth0Sub: sub }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!candidate) {
      return [];
    }

    const maxResults = limit ? parseInt(limit, 10) : 10;
    return this.aiMatchingService.getRecommendationsForCandidate(candidate.id, maxResults);
  }

  @Get('recruiter/mandate/:mandateId/talent-pool')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Find candidates in recruiter network matching a job mandate' })
  @ApiParam({ name: 'mandateId', description: 'Mandate UUID' })
  async getRecruiterTalentPoolMatches(
    @CurrentUser() user: any,
    @Param('mandateId', ParseUUIDPipe) mandateId: string,
    @Query('limit') limit?: string,
  ) {
    const sub = user.auth0Sub || user.sub;
    const email = user.email ? String(user.email).toLowerCase().trim() : '';

    const recruiter = await this.prisma.recruiterProfile.findFirst({
      where: {
        OR: [
          ...(sub ? [{ auth0Sub: sub }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!recruiter) {
      return [];
    }

    const maxResults = limit ? parseInt(limit, 10) : 10;
    return this.aiMatchingService.getTalentPoolMatchesForMandate(
      mandateId,
      recruiter.id,
      maxResults,
    );
  }

  @Post('preflight-check')
  @UserTypes(UserType.RECRUITER, UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Run real-time preflight match evaluation for referral form' })
  async preflightCheck(@CurrentUser() user: any, @Body() dto: PreflightCheckDto) {
    return this.aiMatchingService.preflightCheck(dto, {
      orgId: user.orgId,
      userType: user.userType,
    });
  }

  @Post('referral/:referralId/sync')
  @UserTypes(UserType.RECRUITER, UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Sync AI match evaluation to a referral record' })
  @ApiParam({ name: 'referralId', description: 'Referral UUID' })
  async syncReferralMatch(
    @CurrentUser() user: any,
    @Param('referralId', ParseUUIDPipe) referralId: string,
  ) {
    return this.aiMatchingService.syncReferralMatchScore(referralId, {
      orgId: user.orgId,
      userType: user.userType,
      auth0Sub: user.auth0Sub,
      id: user.id,
    });
  }
}
