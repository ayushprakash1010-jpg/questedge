import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AiCostService } from './ai-cost.service';

@ApiTags('AI Cost (v2)')
@ApiBearerAuth()
@Controller('api/v2/ai-cost')
@Roles(Role.ADMIN, Role.HR)
export class AiCostController {
  constructor(private readonly service: AiCostService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Per-org AI cost dashboard with anomaly flag' })
  dashboard(
    @CurrentUser('orgId') orgId: string,
    @Query('days') days?: string,
  ) {
    return this.service.dashboard(orgId, days ? parseInt(days, 10) : 30);
  }
}

/**
 * Internal endpoint for the FastAPI service to ship per-call telemetry.
 * Public (no Auth0) but gated by the same X-Internal-API-Key middleware that
 * already protects the AI service inbound calls.
 */
@ApiTags('AI Cost Internal')
@Public()
@Controller('api/v2/ai-cost/internal')
export class AiCostInternalController {
  constructor(private readonly service: AiCostService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log a single AI call (for AI service to ship telemetry)' })
  log(
    @Body()
    body: {
      orgId?: string;
      agentName: string;
      modelUsed: string;
      tokensInput?: number;
      tokensOutput?: number;
      costInPaise?: number;
      cacheHit?: boolean;
      status: string;
      latencyMs?: number;
    },
  ) {
    return this.service.logCall(body);
  }
}
