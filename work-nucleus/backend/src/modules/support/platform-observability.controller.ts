import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PlatformObservabilityService } from './platform-observability.service';

@ApiTags('Platform Observability (Support Admin)')
@ApiBearerAuth()
@Roles(Role.SUPPORT_ADMIN)
@Controller('api/v1/support')
export class PlatformObservabilityController {
  constructor(private readonly svc: PlatformObservabilityService) {}

  // ── AI Cost ─────────────────────────────────────────────────────

  @Get('ai-cost')
  @ApiOperation({
    summary:
      'Platform: AI cost dashboard — aggregate across all orgs (SUPPORT_ADMIN)',
  })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  getAiCostDashboard(
    @Query('days') days?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.svc.getAiCostDashboard({
      days: days ? parseInt(days) : 30,
      orgId,
    });
  }

  @Get('ai-cost/logs')
  @ApiOperation({ summary: 'Platform: AI call log (SUPPORT_ADMIN)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'agentName', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  listAiCallLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orgId') orgId?: string,
    @Query('agentName') agentName?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listAiCallLogs({
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
      orgId,
      agentName,
      status,
      from,
      to,
    });
  }

  // ── Audit Log ───────────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({ summary: 'Platform: Cross-org audit log (SUPPORT_ADMIN)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'orgId',
    required: false,
    description: 'Filter to a single org. Omit for all orgs.',
  })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  listPlatformAuditLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orgId') orgId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listPlatformAuditLog({
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
      orgId,
      userId,
      action,
      entityType,
      from,
      to,
    });
  }

  // ── Security Log ─────────────────────────────────────────────────

  @Get('security-log')
  @ApiOperation({
    summary: 'Platform: Cross-org security log viewer (SUPPORT_ADMIN)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  listPlatformSecurityLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orgId') orgId?: string,
    @Query('eventType') eventType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listPlatformSecurityLog({
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
      orgId,
      eventType,
      from,
      to,
    });
  }
}
