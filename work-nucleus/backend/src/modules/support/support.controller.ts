import {
  Controller, Get, Param, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
    return this.supportService.getOrgHealth(orgId, months ? parseInt(months) : 6);
  }
}
