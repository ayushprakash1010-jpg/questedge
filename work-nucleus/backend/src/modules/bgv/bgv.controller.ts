import {
  Body,
  Controller,
  Get,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BgvFinding, BgvProfileStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { BgvService } from './bgv.service';
import { OverrideFindingDto } from './dto/consent.dto';
import { InitiateBgvDto } from './dto/initiate-bgv.dto';

@ApiTags('BGV (v2)')
@ApiBearerAuth()
@Controller('api/v2/bgv')
@Roles(Role.ADMIN, Role.HR)
export class BgvController {
  constructor(
    private readonly service: BgvService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a BGV profile for a candidate' })
  async initiate(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateBgvDto,
  ) {
    const profile = await this.service.initiate(orgId, dto);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'BGV_INITIATED',
      entityType: 'BGV_PROFILE',
      entityId: profile?.id,
      changes: { candidateId: dto.candidateId, packageType: (dto as any).packageType },
    });
    return profile;
  }

  @Get()
  @ApiOperation({ summary: 'List BGV profiles' })
  list(
    @CurrentUser('orgId') orgId: string,
    @Query('status') status?: BgvProfileStatus,
  ) {
    return this.service.listForOrg(orgId, { status });
  }

  @Get('cost-report')
  @ApiOperation({ summary: 'Aggregate BGV cost by type and total' })
  cost(
    @CurrentUser('orgId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.costReport(orgId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('candidates')
  @ApiOperation({
    summary: 'List org candidates and offers available for BGV initiation',
  })
  candidates(@CurrentUser('orgId') orgId: string) {
    return this.service.listCandidatesForInitiation(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one BGV profile (full detail)' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOneForOrg(orgId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a BGV profile with a reason' })
  async cancel(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    const result = await this.service.cancelProfile(orgId, id, body.reason);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'BGV_CANCELLED',
      entityType: 'BGV_PROFILE',
      entityId: id,
      changes: { reason: body.reason },
    });
    return result;
  }

  @Post('checks/:checkId/override')
  @ApiOperation({
    summary: 'Override a check finding with justification (HR_LEAD)',
  })
  @Roles(Role.ADMIN, Role.HR)
  async override(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('checkId', ParseUUIDPipe) checkId: string,
    @Body() dto: OverrideFindingDto,
  ) {
    const result = await this.service.overrideFinding(
      orgId,
      checkId,
      userId,
      dto.finding as BgvFinding,
      dto.justification,
    );
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'BGV_CHECK_OVERRIDDEN',
      entityType: 'BGV_CHECK',
      entityId: checkId,
      changes: { finding: dto.finding },
    });
    return result;
  }

  @Post('checks/:checkId/retry')
  @ApiOperation({ summary: 'Retry a failed check (auto-retry caps at 3)' })
  retry(
    @CurrentUser('orgId') orgId: string,
    @Param('checkId', ParseUUIDPipe) checkId: string,
  ) {
    return this.service.retryFailedCheck(orgId, checkId);
  }
}
