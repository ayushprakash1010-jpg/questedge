import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AiMatchingService } from './ai-matching.service';
import { PreflightCheckDto } from './dto/preflight-check.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('AI Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/ai-matching')
export class AiMatchingController {
  constructor(
    private readonly aiMatchingService: AiMatchingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('candidate/mandate/:mandateId')
  @ApiOperation({ summary: 'Evaluate authenticated candidate profile against a job mandate' })
  @ApiParam({ name: 'mandateId', description: 'Mandate UUID' })
  async evaluateCandidateAgainstMandate(
    @CurrentUser() user: any,
    @Param('mandateId') mandateId: string,
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
      // Provide a clean generic fallback if the candidate has not yet saved their profile
      const mandate = await this.prisma.mandate.findUnique({
        where: { id: mandateId },
        include: { organization: { select: { id: true, name: true } } },
      });
      if (!mandate) {
        throw new NotFoundException(`Job mandate ${mandateId} not found`);
      }
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

    return this.aiMatchingService.evaluateCandidateAgainstMandate(candidate, mandateId ? await this.prisma.mandate.findUnique({ where: { id: mandateId }, include: { organization: { select: { id: true, name: true } } } }) : null);
  }

  @Get('candidate/recommendations')
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
  @ApiOperation({ summary: 'Find candidates in recruiter network matching a job mandate' })
  @ApiParam({ name: 'mandateId', description: 'Mandate UUID' })
  async getRecruiterTalentPoolMatches(
    @CurrentUser() user: any,
    @Param('mandateId') mandateId: string,
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
  @ApiOperation({ summary: 'Run real-time preflight match evaluation for referral form' })
  async preflightCheck(@Body() dto: PreflightCheckDto) {
    return this.aiMatchingService.preflightCheck(dto);
  }

  @Post('referral/:referralId/sync')
  @ApiOperation({ summary: 'Sync AI match evaluation to a referral record' })
  @ApiParam({ name: 'referralId', description: 'Referral UUID' })
  async syncReferralMatch(@Param('referralId') referralId: string) {
    return this.aiMatchingService.syncReferralMatchScore(referralId);
  }
}
