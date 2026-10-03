import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { AddToPipelineDto } from './dto/add-to-pipeline.dto';
import { MoveCandidateDto } from './dto/move-candidate.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { UserType, Role } from '@prisma/client';

@ApiTags('Applications')
@ApiBearerAuth()
@UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // Pipeline endpoints
  @Post('api/v1/hiring-plans/:planId/pipeline/add')
  @ApiOperation({ summary: 'Add candidate to pipeline' })
  addToPipeline(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: AddToPipelineDto,
  ) {
    return this.applicationsService.addToPipeline(planId, dto);
  }

  @Get('api/v1/hiring-plans/:planId/pipeline')
  @ApiOperation({ summary: 'Get Kanban board data' })
  getKanbanBoard(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.applicationsService.getKanbanBoard(planId);
  }

  @Get('api/v1/hiring-plans/:planId/pipeline/stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  getPipelineStats(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.applicationsService.getPipelineStats(planId);
  }

  // Application endpoints
  @Get('api/v1/applications/:appId')
  @ApiOperation({ summary: 'Get application detail' })
  getDetail(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.applicationsService.getDetail(appId);
  }

  @Post('api/v1/applications/:appId/move')
  @ApiOperation({ summary: 'Move candidate to a different stage' })
  moveCandidate(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: MoveCandidateDto,
  ) {
    return this.applicationsService.moveCandidate(appId, dto);
  }

  @Patch('api/v1/applications/:appId/status')
  @ApiOperation({ summary: 'Update application status (select, reject, hold, withdraw)' })
  updateStatus(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(appId, dto);
  }
}
