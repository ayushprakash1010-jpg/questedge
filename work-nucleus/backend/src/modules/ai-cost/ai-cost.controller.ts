import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
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
  dashboard(@CurrentUser('orgId') orgId: string, @Query('days') days?: string) {
    return this.service.dashboard(orgId, days ? parseInt(days, 10) : 30);
  }
}

// ── P0-08: AiCostInternalController REMOVED ──────────────────
// The @Public() endpoint allowed unauthenticated writes to ai cost logs.
// The comment said it was protected by X-Internal-API-Key middleware,
// but no such middleware exists. If the AI service needs to log costs,
// implement a proper internal API key guard first (see P1-10).
// Audit ref: H-01.
