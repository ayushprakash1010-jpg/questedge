import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  DeclinePeerFeedbackDto,
  NominatePeersDto,
  SubmitPeerFeedbackDto,
} from './dto/peer-feedback.dto';
import { PeerFeedbackService } from './peer-feedback.service';

@ApiTags('Peer Feedback (v2)')
@ApiBearerAuth()
@Controller('api/v2/appraisal/peer-feedback')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.VIEWER)
export class PeerFeedbackController {
  constructor(private readonly service: PeerFeedbackService) {}

  @Post('nominate')
  @ApiOperation({ summary: 'Nominate peers (employee or manager on behalf of report)' })
  nominate(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: NominatePeersDto,
  ) {
    return this.service.nominate(orgId, userId, dto);
  }

  @Get('subject')
  @ApiOperation({ summary: 'List nominations for a subject (manager view)' })
  forSubject(
    @CurrentUser('orgId') orgId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
    @Query('subjectUserId', ParseUUIDPipe) subjectUserId: string,
  ) {
    return this.service.listForSubject(orgId, cycleId, subjectUserId);
  }

  @Get('incoming')
  @ApiOperation({ summary: 'List feedback requests directed at the current user' })
  incoming(@CurrentUser('orgId') orgId: string, @CurrentUser('id') userId: string) {
    return this.service.listIncomingForReviewer(orgId, userId);
  }

  @Get('aggregated')
  @ApiOperation({ summary: 'Aggregated themes for manager review (≥3 responses required)' })
  aggregated(
    @CurrentUser('orgId') orgId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
    @Query('subjectUserId', ParseUUIDPipe) subjectUserId: string,
  ) {
    return this.service.aggregatedForManagerReview(orgId, cycleId, subjectUserId);
  }
}

@ApiTags('Public Peer Feedback (v2)')
@Public()
@Controller('api/v2/public/peer-feedback')
export class PeerFeedbackPublicController {
  constructor(private readonly service: PeerFeedbackService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Tokenised reviewer view — never exposes others’ responses' })
  get(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/submit')
  @ApiOperation({ summary: 'Submit peer feedback' })
  submit(@Param('token') token: string, @Body() dto: SubmitPeerFeedbackDto) {
    return this.service.submit(token, dto);
  }

  @Post(':token/decline')
  @ApiOperation({ summary: 'Decline the feedback request with a reason' })
  decline(@Param('token') token: string, @Body() dto: DeclinePeerFeedbackDto) {
    return this.service.decline(token, dto);
  }
}
