import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateGoalDto, CreateOrgGoalDto, UpdateGoalDto } from './dto/goal.dto';
import { GoalsService } from './goals.service';

@ApiTags('Goals (v2)')
@ApiBearerAuth()
@Controller('api/v2/appraisal/goals')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.VIEWER)
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a personal goal in a cycle' })
  create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateGoalDto) {
    return this.service.create(orgId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's goals in a cycle" })
  mine(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.service.listForEmployee(orgId, cycleId, userId);
  }

  @Get('manager')
  @ApiOperation({ summary: "List goals for direct reports (current user as manager)" })
  manager(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.service.listForManager(orgId, cycleId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update goal (description, ratings, comments)' })
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/agree')
  @ApiOperation({ summary: 'Manager agrees to the goal (transitions DRAFT → AGREED)' })
  agree(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.agree(orgId, id);
  }

  @Post('bulk-copy')
  @ApiOperation({ summary: 'Copy goals from previous cycle to current cycle for one employee' })
  bulkCopy(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { fromCycleId: string; toCycleId: string; employeeId: string },
  ) {
    return this.service.copyFromPreviousCycle(orgId, body.fromCycleId, body.toCycleId, body.employeeId);
  }

  @Post('cascade')
  @ApiOperation({ summary: 'Cascade an org goal to direct reports' })
  cascade(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { orgGoalId: string; reportIds: string[]; weight?: number },
  ) {
    return this.service.cascadeOrgGoal(orgId, body.orgGoalId, body.reportIds, { weight: body.weight });
  }

  // ── Org goals ────────────────────────────────────────────────

  @Post('org')
  @ApiOperation({ summary: 'Create an org goal' })
  createOrgGoal(@CurrentUser('orgId') orgId: string, @Body() dto: CreateOrgGoalDto) {
    return this.service.createOrgGoal(orgId, dto);
  }

  @Get('org')
  @ApiOperation({ summary: 'List the org goal tree for a cycle' })
  listOrgGoals(@CurrentUser('orgId') orgId: string, @Query('cycleId', ParseUUIDPipe) cycleId: string) {
    return this.service.listOrgGoals(orgId, cycleId);
  }
}
