import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CycleStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AppraisalCyclesService } from './appraisal-cycles.service';
import { CreateAppraisalCycleDto } from './dto/create-cycle.dto';

@ApiTags('Appraisal Cycles (v2)')
@ApiBearerAuth()
@Controller('api/v2/appraisal/cycles')
@Roles(Role.ADMIN, Role.HR)
export class AppraisalCyclesController {
  constructor(private readonly service: AppraisalCyclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appraisal cycle (admin only)' })
  create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateAppraisalCycleDto) {
    return this.service.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cycles for the org' })
  list(@CurrentUser('orgId') orgId: string) {
    return this.service.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single cycle' })
  findOne(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post(':id/advance')
  @ApiOperation({ summary: 'Advance the cycle to the next stage' })
  advance(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.advanceStage(orgId, id);
  }

  @Post(':id/set-stage')
  @ApiOperation({ summary: 'Force-set the cycle stage (with safety checks)' })
  setStage(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { target: CycleStatus },
  ) {
    return this.service.setStage(orgId, id, body.target);
  }

  @Post(':id/reopen-assessment')
  @ApiOperation({ summary: 'Reopen one employee’s assessment (audit-logged)' })
  reopen(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { employeeId: string; reason: string },
  ) {
    return this.service.reopenAssessment(orgId, id, body.employeeId, body.reason);
  }
}
