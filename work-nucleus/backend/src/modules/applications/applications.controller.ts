import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { AddToPipelineDto } from './dto/add-to-pipeline.dto';
import { MoveCandidateDto } from './dto/move-candidate.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserType, Role } from '@prisma/client';

/**
 * P0-07: Added @Roles gates to mutation endpoints so VIEWERs cannot
 * select, reject, move or add candidates.
 *
 * P0-04 (partial): Added @CurrentUser('orgId') and pass it to services
 * for tenant-scoped lookups. Full scoping of the service layer is
 * tracked under P0-04.
 *
 * Audit refs: F-02, F-07.
 */
@ApiTags('Applications')
@ApiBearerAuth()
@UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // Pipeline endpoints
  @Post('api/v1/hiring-plans/:planId/pipeline/add')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Add candidate to pipeline' })
  addToPipeline(
    @CurrentUser('orgId') orgId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: AddToPipelineDto,
  ) {
    return this.applicationsService.addToPipeline(planId, dto, orgId);
  }

  @Get('api/v1/hiring-plans/:planId/pipeline')
  @ApiOperation({ summary: 'Get Kanban board data' })
  getKanbanBoard(
    @CurrentUser('orgId') orgId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.applicationsService.getKanbanBoard(planId, orgId);
  }

  @Get('api/v1/hiring-plans/:planId/pipeline/stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  getPipelineStats(
    @CurrentUser('orgId') orgId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.applicationsService.getPipelineStats(planId, orgId);
  }

  // Application endpoints
  @Get('api/v1/applications/:appId')
  @ApiOperation({ summary: 'Get application detail' })
  getDetail(
    @CurrentUser('orgId') orgId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
  ) {
    return this.applicationsService.getDetail(appId, orgId);
  }

  @Post('api/v1/applications/:appId/move')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Move candidate to a different stage' })
  moveCandidate(
    @CurrentUser('orgId') orgId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: MoveCandidateDto,
  ) {
    return this.applicationsService.moveCandidate(appId, dto, orgId);
  }

  @Patch('api/v1/applications/:appId/status')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({
    summary: 'Update application status (select, reject, hold, withdraw)',
  })
  updateStatus(
    @CurrentUser('orgId') orgId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(appId, dto, orgId);
  }

  @Post('api/v1/applications/:appId/generate-questions')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({
    summary: 'Generate AI-tailored interview questions and evaluation rubrics for candidate',
  })
  generateInterviewQuestions(
    @CurrentUser('orgId') orgId: string,
    @Param('appId', ParseUUIDPipe) appId: string,
  ) {
    return this.applicationsService.generateInterviewQuestions(appId, orgId);
  }
}
