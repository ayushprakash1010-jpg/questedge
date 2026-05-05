import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AssessmentsService } from './assessments.service';
import {
  AutosaveAssessmentDto,
  FinaliseAssessmentDto,
  StartAssessmentDto,
} from './dto/assessment.dto';

@ApiTags('Appraisal Assessments (v2)')
@ApiBearerAuth()
@Controller('api/v2/appraisal/assessments')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.VIEWER)
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}

  @Get('home')
  @ApiOperation({ summary: 'Employee appraisal home (cycles, goals, pending peer asks)' })
  home(@CurrentUser('orgId') orgId: string, @CurrentUser('id') userId: string) {
    return this.service.myAppraisalHome(orgId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Start (or fetch) an assessment for a (cycle, employee, type)' })
  start(@CurrentUser('orgId') orgId: string, @Body() dto: StartAssessmentDto) {
    return this.service.start(orgId, dto);
  }

  @Patch(':id/autosave')
  @ApiOperation({ summary: 'Auto-save form data and ratings (debounced from frontend)' })
  autosave(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutosaveAssessmentDto,
  ) {
    return this.service.autosave(orgId, id, userId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a SELF assessment or mark a MANAGER review as REVIEWED' })
  submit(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.submit(orgId, id, userId);
  }

  @Post(':id/finalise')
  @ApiOperation({ summary: 'Manager finalises the rating' })
  finalise(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinaliseAssessmentDto,
  ) {
    return this.service.finalise(orgId, id, userId, dto);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Employee acknowledges the rating after the 1-on-1' })
  acknowledge(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.acknowledge(orgId, id, userId);
  }

  @Get('side-by-side')
  @ApiOperation({ summary: 'Side-by-side: self + manager + goals + peer count for one employee' })
  sideBySide(
    @CurrentUser('orgId') orgId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.service.sideBySide(orgId, cycleId, employeeId);
  }

  @Post('ai-suggest')
  @ApiOperation({ summary: 'AI advisory summary for the manager review (advisory only)' })
  aiSuggest(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { cycleId: string; employeeId: string },
  ) {
    return this.service.aiSuggest(orgId, body.cycleId, body.employeeId);
  }
}
