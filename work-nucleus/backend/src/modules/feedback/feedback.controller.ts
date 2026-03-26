import {
  Controller, Get, Post, Param, Body, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateOrUpdateFeedbackDto } from './dto/create-feedback.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('api/v1/applications/:appId/feedback')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Create or update feedback draft' })
  createOrUpdate(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: CreateOrUpdateFeedbackDto,
    @Req() req: any,
  ) {
    return this.feedbackService.createOrUpdateDraft(appId, req.user.id, dto);
  }

  @Post('api/v1/feedback/:feedbackId/submit')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Submit feedback (finalize)' })
  submit(
    @Param('feedbackId', ParseUUIDPipe) feedbackId: string,
    @Req() req: any,
  ) {
    return this.feedbackService.submit(feedbackId, req.user.id);
  }

  @Get('api/v1/applications/:appId/feedback')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get all feedback for an application (RBAC-aware)' })
  getAllForApplication(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Req() req: any,
  ) {
    return this.feedbackService.getAllForApplication(appId, req.user.id, req.user.role);
  }

  @Get('api/v1/applications/:appId/feedback/matrix')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get skill rating matrix for an application' })
  getSkillMatrix(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.feedbackService.getSkillMatrix(appId);
  }

  @Post('api/v1/applications/:appId/feedback/summarize')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Trigger AI summary generation' })
  triggerAiSummary(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.feedbackService.triggerAiSummary(appId);
  }

  @Post('api/v1/applications/:appId/score')
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @ApiOperation({ summary: 'Trigger AI candidate scoring' })
  triggerAiScoring(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.feedbackService.triggerAiScoring(appId);
  }
}
