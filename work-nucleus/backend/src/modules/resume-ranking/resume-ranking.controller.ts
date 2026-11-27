import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role, UserType } from '@prisma/client';
import { ResumeRankingService } from './resume-ranking.service';
import {
  RankResumesDto,
  ReRankDto,
  QuickRankDto,
} from './dto/rank-resumes.dto';

@ApiTags('Resume Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
@Controller('api/v1/resume-ranking')
export class ResumeRankingController {
  constructor(private readonly rankingService: ResumeRankingService) {}

  @Post('rank')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({
    summary: 'Rank multiple candidate resumes against a mandate JD',
  })
  async rankResumes(@CurrentUser() user: any, @Body() dto: RankResumesDto) {
    const orgId = user.orgId;
    const userId = user.id || user.sub;
    return this.rankingService.rankResumes(orgId, userId, dto);
  }

  @Get('sessions/:mandateId')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({
    summary: 'List past ranking sessions for a mandate',
  })
  @ApiParam({ name: 'mandateId', description: 'Mandate UUID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSessionsForMandate(
    @CurrentUser() user: any,
    @Param('mandateId') mandateId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingService.getSessionsForMandate(
      user.orgId,
      mandateId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('session/:sessionId')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({
    summary: 'Get full ranking results for a session',
  })
  @ApiParam({ name: 'sessionId', description: 'Ranking session UUID' })
  async getSessionResults(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.rankingService.getSessionResults(user.orgId, sessionId);
  }

  @Post('re-rank/:sessionId')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({
    summary: 'Re-rank a previous session with different scoring weights',
  })
  @ApiParam({ name: 'sessionId', description: 'Original ranking session UUID' })
  async reRank(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: ReRankDto,
  ) {
    const orgId = user.orgId;
    const userId = user.id || user.sub;
    return this.rankingService.reRank(
      orgId,
      userId,
      sessionId,
      dto.customWeights,
    );
  }

  // ── Feature 4: CSV Export ───────────────────────────────────────

  @Get('session/:sessionId/export/csv')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({
    summary: 'Export ranking session results as CSV',
  })
  @ApiParam({ name: 'sessionId', description: 'Ranking session UUID' })
  async exportCsv(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const csv = await this.rankingService.exportSessionCsv(
      user.orgId,
      sessionId,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ranking-${sessionId.substring(0, 8)}.csv"`,
    );
    res.send(csv);
  }

  // ── Feature 3: Compare Candidates ─────────────────────────────

  @Post('session/:sessionId/compare')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({
    summary: 'Compare 2-4 candidates side by side from a ranking session',
  })
  @ApiParam({ name: 'sessionId', description: 'Ranking session UUID' })
  async compareCandidates(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { candidateIds: string[] },
  ) {
    return this.rankingService.compareCandidates(
      user.orgId,
      sessionId,
      body.candidateIds,
    );
  }

  // ── Quick Rank: Standalone ad-hoc ranking ─────────────────────

  @Post('quick-rank')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({
    summary:
      'Quick rank: upload JD text + resume texts for instant ranking (no mandate needed)',
  })
  async quickRank(@CurrentUser() user: any, @Body() dto: QuickRankDto) {
    return this.rankingService.quickRank(user.orgId, dto);
  }
}
