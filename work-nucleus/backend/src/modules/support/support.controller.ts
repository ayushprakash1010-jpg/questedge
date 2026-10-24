import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';

@ApiTags('Support')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get cross-org support dashboard KPIs' })
  getDashboard() {
    return this.supportService.getDashboard();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations with summary stats' })
  getOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('industry') industry?: string,
  ) {
    return this.supportService.getOrganizations({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      industry,
    });
  }

  @Get('organizations/:orgId')
  @ApiOperation({ summary: 'Get organization detail with aggregated stats' })
  getOrganizationDetail(@Param('orgId') orgId: string) {
    return this.supportService.getOrganizationDetail(orgId);
  }

  @Get('organizations/:orgId/users')
  @ApiOperation({ summary: 'Get users for an organization (read-only)' })
  getOrgUsers(
    @Param('orgId') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supportService.getOrgUsers(orgId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('organizations/:orgId/hiring-plans')
  @ApiOperation({ summary: 'Get hiring plans for an organization (read-only)' })
  getOrgHiringPlans(
    @Param('orgId') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.supportService.getOrgHiringPlans(orgId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
    });
  }

  @Get('organizations/:orgId/health')
  @ApiOperation({ summary: 'Get org health metrics history' })
  getOrgHealth(
    @Param('orgId') orgId: string,
    @Query('months') months?: string,
  ) {
    return this.supportService.getOrgHealth(
      orgId,
      months ? parseInt(months) : 6,
    );
  }

  @Get('organizations/export')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Platform: Export organizations as CSV (SUPPORT_ADMIN)' })
  async exportOrganizations(
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Res() res?: Response,
  ) {
    const result = await this.supportService.getOrganizations({
      page: 1,
      limit: 5000,
      search,
      industry,
    });

    const rows = [
      ['ID', 'Name', 'Industry', 'Users', 'Hiring Plans', 'Support Tickets', 'Health Score', 'Created At'],
      ...result.data.map((org: any) => [
        org.id,
        org.name,
        org.industry ?? '',
        org._count?.users ?? '',
        org._count?.hiringPlans ?? '',
        org._count?.supportTickets ?? '',
        org.healthScore ?? '',
        new Date(org.createdAt).toISOString(),
      ]),
    ];

    const csv = rows.map((r) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res!.setHeader('Content-Type', 'text/csv');
    res!.setHeader('Content-Disposition', `attachment; filename="organizations-export-${Date.now()}.csv"`);
    res!.send(csv);
  }
}
