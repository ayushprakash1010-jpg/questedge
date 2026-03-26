import {
  Controller, Get, Post, Param, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportAnalyticsService } from './support-analytics.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Support Analytics')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support/analytics')
export class SupportAnalyticsController {
  constructor(private readonly analyticsService: SupportAnalyticsService) {}

  @Get('ticket-volume')
  @ApiOperation({ summary: 'Get ticket volume over time' })
  getTicketVolume(
    @Query('period') period?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.analyticsService.getTicketVolume(period || 'monthly', groupBy);
  }

  @Get('response-time')
  @ApiOperation({ summary: 'Get average response and resolution times' })
  getResponseTime(@Query('groupBy') groupBy?: string) {
    return this.analyticsService.getResponseTime(groupBy);
  }

  @Get('sla-compliance')
  @ApiOperation({ summary: 'Get SLA compliance metrics' })
  getSlaCompliance(@Query('period') period?: string) {
    return this.analyticsService.getSlaCompliance(period || 'monthly');
  }

  @Get('org-health')
  @ApiOperation({ summary: 'Get all orgs health scores' })
  getAllOrgHealth() {
    return this.analyticsService.getAllOrgHealth();
  }

  @Get('org-health/:orgId')
  @ApiOperation({ summary: 'Get single org health detail' })
  getOrgHealthDetail(@Param('orgId') orgId: string) {
    return this.analyticsService.getOrgHealthDetail(orgId);
  }

  @Get('rep-performance')
  @ApiOperation({ summary: 'Get support rep performance metrics' })
  getRepPerformance() {
    return this.analyticsService.getRepPerformance();
  }

  @Post('compute-health')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Trigger health score recalculation for all orgs' })
  computeOrgHealth() {
    return this.analyticsService.computeOrgHealth();
  }
}
