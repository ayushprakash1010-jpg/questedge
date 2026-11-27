import {
  Body,
  Controller,
  Get,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CycleStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AppraisalCyclesService } from './appraisal-cycles.service';
import { CreateAppraisalCycleDto } from './dto/create-cycle.dto';
import { AuditService } from '../audit/audit.service';

@ApiTags('Appraisal Cycles (v2)')
@ApiBearerAuth()
@Controller('api/v2/appraisal/cycles')
@Roles(Role.ADMIN, Role.HR)
export class AppraisalCyclesController {
  constructor(
    private readonly service: AppraisalCyclesService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appraisal cycle (admin only)' })
  async create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAppraisalCycleDto,
  ) {
    const created = await this.service.create(orgId, dto);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'APPRAISAL_CYCLE_CREATED',
      entityType: 'APPRAISAL_CYCLE',
      entityId: created?.id,
      changes: { name: dto.name },
    });
    return created;
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'List cycles for the org' })
  list(@CurrentUser('orgId') orgId: string) {
    return this.service.list(orgId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get a single cycle' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Post(':id/advance')
  @ApiOperation({ summary: 'Advance the cycle to the next stage' })
  async advance(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.advanceStage(orgId, id);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'APPRAISAL_CYCLE_ADVANCED',
      entityType: 'APPRAISAL_CYCLE',
      entityId: id,
    });
    return result;
  }

  @Post(':id/set-stage')
  @ApiOperation({ summary: 'Force-set the cycle stage (with safety checks)' })
  async setStage(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { target: CycleStatus },
  ) {
    const result = await this.service.setStage(orgId, id, body.target);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'APPRAISAL_CYCLE_STAGE_SET',
      entityType: 'APPRAISAL_CYCLE',
      entityId: id,
      changes: { target: body.target },
    });
    return result;
  }

  @Post(':id/reopen-assessment')
  @ApiOperation({ summary: 'Reopen one employee’s assessment (audit-logged)' })
  async reopen(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { employeeId: string; reason: string },
  ) {
    const result = await this.service.reopenAssessment(
      orgId,
      id,
      body.employeeId,
      body.reason,
    );
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'APPRAISAL_ASSESSMENT_REOPENED',
      entityType: 'APPRAISAL_ASSESSMENT',
      entityId: id,
      changes: { employeeId: body.employeeId, reason: body.reason },
    });
    return result;
  }
}
