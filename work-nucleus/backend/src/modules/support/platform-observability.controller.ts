import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('audit-log/export')
  @ApiOperation({ summary: 'Platform: Export audit log as CSV (SUPPORT_ADMIN)' })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportAuditLogCsv(
    @Query('orgId') orgId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const result = await this.svc.listPlatformAuditLog({
      page: 1,
      limit: 5000,
      orgId,
      userId,
      action,
      entityType,
      from,
      to,
    });

    const rows = [
      ['ID', 'Action', 'Entity Type', 'Entity ID', 'User Name', 'User Email', 'IP Address', 'Created At'],
      ...result.data.map((log: any) => [
        log.id,
        log.action,
        log.entityType,
        log.entityId ?? '',
        log.user?.name ?? '',
        log.user?.email ?? '',
        log.ipAddress ?? '',
        new Date(log.createdAt).toISOString(),
      ]),
    ];

    const csv = rows.map((r) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-export-${Date.now()}.csv"`);
    res.send(csv);
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
