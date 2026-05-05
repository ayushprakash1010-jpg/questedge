import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, RevisionStatus } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompAllocatorService } from '../comp-allocator/comp-allocator.service';
import { CompRevisionsService } from './comp-revisions.service';
import { ApprovalActionDto, OverrideRevisionDto, SimulateDto } from './dto/revision.dto';

@ApiTags('Compensation Revisions (v2)')
@ApiBearerAuth()
@Controller('api/v2/compensation/revisions')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class CompRevisionsController {
  constructor(
    private readonly service: CompRevisionsService,
    private readonly allocator: CompAllocatorService,
  ) {}

  @Post('allocate')
  @ApiOperation({ summary: 'Run the allocator across all manager-finalised assessments in a cycle' })
  @Roles(Role.ADMIN, Role.HR)
  allocate(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { cycleId: string; effectiveDate?: string },
  ) {
    return this.allocator.allocate(orgId, body.cycleId, {
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
    });
  }

  @Post('reallocate')
  @ApiOperation({ summary: 'Re-run allocator (preserves any LOCKED revisions)' })
  @Roles(Role.ADMIN, Role.HR)
  reallocate(@CurrentUser('orgId') orgId: string, @Body() body: { cycleId: string }) {
    return this.allocator.allocate(orgId, body.cycleId);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'What-if simulator (no persistence)' })
  simulate(@CurrentUser('orgId') orgId: string, @Body() dto: SimulateDto) {
    return this.allocator.simulate(orgId, dto.cycleId, {
      overridePools: dto.overridePools,
      overrideMatrix: dto.overrideMatrix,
      overrideRatings: dto.overrideRatings,
    });
  }

  @Get('equity')
  @ApiOperation({ summary: 'Equity-lens diff (median + spread by location)' })
  equity(
    @CurrentUser('orgId') orgId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.allocator.equityDiff(orgId, cycleId);
  }

  @Get()
  @ApiOperation({ summary: 'List revisions' })
  list(
    @CurrentUser('orgId') orgId: string,
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: RevisionStatus,
  ) {
    return this.service.list(orgId, { cycleId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get revision' })
  findOne(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post(':id/override')
  @ApiOperation({ summary: 'Manager override (requires reason)' })
  override(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideRevisionDto,
  ) {
    return this.service.override(orgId, id, userId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit revision into approval chain' })
  submit(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.submitToApproval(orgId, id);
  }

  @Post(':id/act')
  @ApiOperation({ summary: 'Act on the current approval step (APPROVE/REJECT)' })
  act(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.service.act(orgId, id, userId, dto.action, dto.comment);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock revision (post-CEO approval)' })
  lock(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.lock(orgId, id);
  }

  @Post(':id/letter')
  @ApiOperation({ summary: 'Generate the comp revision letter' })
  generateLetter(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.generateLetter(orgId, id);
  }

  @Post(':id/log-1on1')
  @ApiOperation({ summary: 'Manager logs that the 1-on-1 was conducted (manager-first gate)' })
  logOneOnOne(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markOneOnOne(orgId, id, userId);
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Deliver the letter to employee (gated on 1-on-1)' })
  deliver(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.deliver(orgId, id);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Employee acknowledges the comp revision' })
  acknowledge(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.acknowledge(orgId, id, userId);
  }

  @Get('cycles/:cycleId/variance')
  @ApiOperation({ summary: 'Variance report for a cycle' })
  variance(@CurrentUser('orgId') orgId: string, @Param('cycleId', ParseUUIDPipe) cycleId: string) {
    return this.service.varianceReport(orgId, cycleId);
  }

  @Get('cycles/:cycleId/export')
  @ApiOperation({ summary: 'Payroll export (keka | darwinbox | zinghr | csv)' })
  payrollExport(
    @CurrentUser('orgId') orgId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
    @Query('format') format: 'keka' | 'darwinbox' | 'zinghr' | 'csv' = 'csv',
  ) {
    return this.service.payrollExport(orgId, cycleId, format);
  }
}
