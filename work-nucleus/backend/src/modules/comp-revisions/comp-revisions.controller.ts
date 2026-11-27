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
import { Role, RevisionStatus } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompAllocatorService } from '../comp-allocator/comp-allocator.service';
import { AuditService } from '../audit/audit.service';
import { CompRevisionsService } from './comp-revisions.service';
import {
  ApprovalActionDto,
  OverrideRevisionDto,
  SimulateDto,
} from './dto/revision.dto';

@ApiTags('Compensation Revisions (v2)')
@ApiBearerAuth()
@Controller('api/v2/compensation/revisions')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class CompRevisionsController {
  constructor(
    private readonly service: CompRevisionsService,
    private readonly allocator: CompAllocatorService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  @Post('allocate')
  @ApiOperation({
    summary:
      'Run the allocator across all manager-finalised assessments in a cycle',
  })
  @Roles(Role.ADMIN, Role.HR)
  async allocate(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { cycleId: string; effectiveDate?: string },
  ) {
    const result = await this.allocator.allocate(orgId, body.cycleId, {
      effectiveDate: body.effectiveDate
        ? new Date(body.effectiveDate)
        : undefined,
    });
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'COMP_ALLOCATED',
      entityType: 'COMP_REVISION',
      changes: { cycleId: body.cycleId },
    });
    return result;
  }

  @Post('reallocate')
  @ApiOperation({
    summary: 'Re-run allocator (preserves any LOCKED revisions)',
  })
  @Roles(Role.ADMIN, Role.HR)
  async reallocate(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { cycleId: string },
  ) {
    const result = await this.allocator.allocate(orgId, body.cycleId);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'COMP_REALLOCATED',
      entityType: 'COMP_REVISION',
      changes: { cycleId: body.cycleId },
    });
    return result;
  }

  @Post('simulate')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'What-if simulator (no persistence)' })
  simulate(@CurrentUser('orgId') orgId: string, @Body() dto: SimulateDto) {
    return this.allocator.simulate(orgId, dto.cycleId, {
      overridePools: dto.overridePools,
      overrideMatrix: dto.overrideMatrix,
      overrideRatings: dto.overrideRatings,
    });
  }

  @Get('equity')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Equity-lens diff (median + spread by location)' })
  equity(
    @CurrentUser('orgId') orgId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.allocator.equityDiff(orgId, cycleId);
  }

  @Get()
  @ApiOperation({ summary: 'List revisions (ADMIN/HR see org; managers see reports)' })
  list(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: RevisionStatus,
  ) {
    const isHrOrAdmin = userRole === Role.ADMIN || userRole === Role.HR;
    return this.service.list(orgId, {
      cycleId,
      status,
      managerUserId: isHrOrAdmin ? undefined : userId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get revision' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOneForActor(orgId, id, userId, userRole);
  }

  @Post(':id/override')
  @ApiOperation({ summary: 'Manager override (requires reason)' })
  async override(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideRevisionDto,
  ) {
    const result = await this.service.override(orgId, id, userId, dto, userRole);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'COMP_OVERRIDDEN',
      entityType: 'COMP_REVISION',
      entityId: id,
      changes: { reason: dto.overrideReason },
    });
    return result;
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit revision into approval chain' })
  submit(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.submitToApproval(orgId, id, userId, userRole);
  }

  @Post(':id/act')
  @ApiOperation({
    summary: 'Act on the current approval step (APPROVE/REJECT)',
  })
  act(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.service.act(orgId, id, userId, userRole, dto.action, dto.comment);
  }

  @Post(':id/lock')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Lock revision (post-CEO approval)' })
  async lock(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.lock(orgId, id);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'COMP_LOCKED',
      entityType: 'COMP_REVISION',
      entityId: id,
    });
    return result;
  }

  @Post(':id/letter')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Generate the comp revision letter' })
  generateLetter(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.generateLetter(orgId, id);
  }

  @Get(':id/letter')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a signed download URL for the generated comp revision letter' })
  getLetter(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getLetterUrl(orgId, id, userId, userRole);
  }

  @Post(':id/log-1on1')
  @ApiOperation({
    summary: 'Manager logs that the 1-on-1 was conducted (manager-first gate)',
  })
  logOneOnOne(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markOneOnOne(orgId, id, userId, userRole);
  }

  @Post(':id/deliver')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Deliver the letter to employee (gated on 1-on-1)' })
  async deliver(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.deliver(orgId, id);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'COMP_DELIVERED',
      entityType: 'COMP_REVISION',
      entityId: id,
    });
    return result;
  }

  @Post(':id/acknowledge')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.VIEWER)
  @ApiOperation({ summary: 'Employee acknowledges the comp revision' })
  acknowledge(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.acknowledge(orgId, id, userId);
  }

  @Get('cycles/:cycleId/variance')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Variance report for a cycle' })
  variance(
    @CurrentUser('orgId') orgId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.service.varianceReport(orgId, cycleId);
  }

  @Get('cycles/:cycleId/export')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Payroll export (keka | darwinbox | zinghr | csv)' })
  payrollExport(
    @CurrentUser('orgId') orgId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
    @Query('format') format: 'keka' | 'darwinbox' | 'zinghr' | 'csv' = 'csv',
  ) {
    return this.service.payrollExport(orgId, cycleId, format);
  }
}
