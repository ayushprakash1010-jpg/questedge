import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import { MakeDecisionDto, UpdateCommunicationDto } from './dto/make-decision.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
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
    @Req() req: any,
  ) {
    return this.decisionsService.makeDecision(appId, req.user.id, dto);
  }

  @Get('api/v1/applications/:appId/decision')
  @ApiOperation({ summary: 'Get decision for application' })
  getDecision(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.decisionsService.getDecision(appId);
  }

  @Post('api/v1/applications/:appId/decision/approve')
  @ApiOperation({ summary: 'Approve a decision' })
  approveDecision(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Req() req: any,
  ) {
    return this.decisionsService.approveDecision(appId, req.user.id);
  }

  @Patch('api/v1/applications/:appId/decision/communication')
  @ApiOperation({ summary: 'Update communication draft' })
  updateCommunication(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: UpdateCommunicationDto,
  ) {
    return this.decisionsService.updateCommunication(appId, dto);
  }

  @Post('api/v1/applications/:appId/decision/send')
  @ApiOperation({ summary: 'Mark communication as sent' })
  markSent(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.decisionsService.markCommunicationSent(appId);
  }

  @Get('api/v1/applications/:appId/timeline')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get full candidate timeline' })
  getTimeline(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.decisionsService.getTimeline(appId);
  }

  @Get('api/v1/hiring-plans/:planId/decisions')
  @ApiOperation({ summary: 'Get all decisions for a hiring plan' })
  getDecisionsForPlan(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.decisionsService.getDecisionsForPlan(planId);
  }
}
