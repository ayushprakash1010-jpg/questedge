import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import {
  MakeDecisionDto,
  UpdateCommunicationDto,
} from './dto/make-decision.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Decisions')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
@Controller()
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post('api/v1/applications/:appId/decision')
  @ApiOperation({ summary: 'Make selection/rejection decision' })
  makeDecision(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: MakeDecisionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.makeDecision(appId, userId, dto, orgId);
  }

  @Get('api/v1/applications/:appId/decision')
  @ApiOperation({ summary: 'Get decision for application' })
  getDecision(
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.getDecision(appId, orgId);
  }

  @Post('api/v1/applications/:appId/decision/approve')
  @ApiOperation({ summary: 'Approve a decision' })
  approveDecision(
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.approveDecision(appId, userId, orgId);
  }

  @Patch('api/v1/applications/:appId/decision/communication')
  @ApiOperation({ summary: 'Update communication draft' })
  updateCommunication(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: UpdateCommunicationDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.updateCommunication(appId, dto, orgId);
  }

  @Post('api/v1/applications/:appId/decision/send')
  @ApiOperation({ summary: 'Mark communication as sent' })
  markSent(
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.markCommunicationSent(appId, orgId);
  }

  @Get('api/v1/applications/:appId/timeline')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get full candidate timeline' })
  getTimeline(
    @Param('appId', ParseUUIDPipe) appId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.getTimeline(appId, orgId);
  }

  @Get('api/v1/hiring-plans/:planId/decisions')
  @ApiOperation({ summary: 'Get all decisions for a hiring plan' })
  getDecisionsForPlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.decisionsService.getDecisionsForPlan(planId, orgId);
  }
}
