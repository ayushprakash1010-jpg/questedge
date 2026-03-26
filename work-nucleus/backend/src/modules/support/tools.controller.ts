import {
  Controller, Get, Post, Patch, Param, Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Support Tools')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('export-data')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Export org data for compliance/GDPR requests' })
  exportData(@Body('orgId') orgId: string, @Body('dataTypes') dataTypes: string[]) {
    return this.toolsService.exportData(orgId, dataTypes);
  }

  @Get('feature-flags/:orgId')
  @ApiOperation({ summary: 'Get feature flags for an organization' })
  getFeatureFlags(@Param('orgId') orgId: string) {
    return this.toolsService.getFeatureFlags(orgId);
  }

  @Patch('feature-flags/:orgId')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Update feature flags for an organization' })
  updateFeatureFlags(@Param('orgId') orgId: string, @Body() flags: Record<string, boolean>) {
    return this.toolsService.updateFeatureFlags(orgId, flags);
  }

  @Post('bulk-action')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Execute bulk operations' })
  bulkAction(@Body() payload: { action: string; params: Record<string, any> }) {
    return this.toolsService.bulkAction(payload.action, payload.params);
  }
}
