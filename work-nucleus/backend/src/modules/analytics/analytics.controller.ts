import {
  Controller, Get, Post, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.VIEWER)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview KPIs' })
  getOverview(@Req() req: any) {
    return this.analyticsService.getOverview(req.user.orgId);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get pipeline funnel data' })
  getPipelineFunnel(
    @Req() req: any,
    @Query('hiringPlanId') hiringPlanId?: string,
  ) {
    return this.analyticsService.getPipelineFunnel(req.user.orgId, hiringPlanId);
  }

  @Get('time-to-hire')
  @ApiOperation({ summary: 'Get time-to-hire metrics' })
  getTimeToHire(
    @Req() req: any,
    @Query('groupBy') groupBy?: 'role' | 'department' | 'quarter',
  ) {
    return this.analyticsService.getTimeToHire(req.user.orgId, groupBy);
  }

  @Get('cost')
  @ApiOperation({ summary: 'Get cost tracking per plan' })
  getCostTracking(@Req() req: any) {
    return this.analyticsService.getCostTracking(req.user.orgId);
  }

  @Get('interviewers')
  @ApiOperation({ summary: 'Get interviewer performance stats' })
  getInterviewerStats(@Req() req: any) {
    return this.analyticsService.getInterviewerStats(req.user.orgId);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get hiring progress per plan' })
  getHiringProgress(@Req() req: any) {
    return this.analyticsService.getHiringProgress(req.user.orgId);
  }

  @Get('sources')
  @ApiOperation({ summary: 'Get source effectiveness' })
  getSourceEffectiveness(@Req() req: any) {
    return this.analyticsService.getSourceEffectiveness(req.user.orgId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get latest persisted AI insights' })
  getLatestInsights(@Req() req: any) {
    return this.analyticsService.getLatestInsights(req.user.orgId);
  }

  @Post('insights')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Generate and persist AI-powered hiring insights' })
  generateInsights(@Req() req: any) {
    return this.analyticsService.generateInsights(req.user.orgId, req.user.id);
  }
}
