import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { AssessmentEngineService } from './assessment-engine.service';
import { QuizService } from './quiz/quiz.service';
import { CodingService } from './coding/coding.service';
import { VideoInterviewService } from './video/video-interview.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  CreateCodingChallengeDto,
  SubmitQuizDto,
  RunCodeDto,
  SubmitCodeDto,
  UpdateAntiCheatDto,
  SendAssessmentInviteDto,
} from './dto';
import { Request } from 'express';

// ══════════════════════════════════════════════════════════════════
// Admin/Company-Facing Endpoints (Authenticated)
// ══════════════════════════════════════════════════════════════════

@ApiTags('Assessment Engine')
@ApiBearerAuth()
@Controller('api/v2/assessments')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class AssessmentEngineController {
  constructor(
    private readonly service: AssessmentEngineService,
    private readonly quizService: QuizService,
    private readonly codingService: CodingService,
    private readonly videoService: VideoInterviewService,
  ) {}

  // ── Assessment CRUD ───────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new assessment (quiz, coding, or video)' })
  create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.create(dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List all assessments' })
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query('type') type?: string,
    @Query('mandateId') mandateId?: string,
  ) {
    return this.service.findAll(orgId, { type, mandateId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment details with questions/challenges' })
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assessment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.update(id, dto, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assessment' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.remove(id, orgId);
  }

  // ── Questions (Quiz) ──────────────────────────────────────────

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a question to a quiz assessment' })
  addQuestion(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.quizService.addQuestion(assessmentId, dto, orgId);
  }

  @Patch(':id/questions/:questionId')
  @ApiOperation({ summary: 'Update a question' })
  updateQuestion(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: Partial<CreateQuestionDto>,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.quizService.updateQuestion(assessmentId, questionId, dto, orgId);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a question' })
  removeQuestion(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.quizService.removeQuestion(assessmentId, questionId, orgId);
  }

  // ── Coding Challenges ─────────────────────────────────────────

  @Post(':id/challenges')
  @ApiOperation({ summary: 'Add a coding challenge to a coding assessment' })
  addChallenge(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body() dto: CreateCodingChallengeDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.codingService.addChallenge(assessmentId, dto, orgId);
  }

  @Patch(':id/challenges/:challengeId')
  @ApiOperation({ summary: 'Update a coding challenge' })
  updateChallenge(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @Body() dto: Partial<CreateCodingChallengeDto>,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.codingService.updateChallenge(assessmentId, challengeId, dto, orgId);
  }

  @Delete(':id/challenges/:challengeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a coding challenge' })
  removeChallenge(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.codingService.removeChallenge(assessmentId, challengeId, orgId);
  }

  // ── Invitations ───────────────────────────────────────────────

  @Post(':id/invite')
  @ApiOperation({ summary: 'Send assessment invite to a candidate (generates access token)' })
  sendInvite(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body() dto: SendAssessmentInviteDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.sendInvite(assessmentId, dto, orgId);
  }

  // ── Results / Analytics ───────────────────────────────────────

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get assessment analytics (pass rate, scores, etc.)' })
  getAnalytics(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.getAssessmentAnalytics(assessmentId, orgId);
  }

  @Get('attempts/:attemptId/results')
  @ApiOperation({ summary: 'Get detailed results for a specific attempt' })
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  getAttemptResults(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.service.getAttemptResults(attemptId, orgId);
  }

  // ── Video Interviews ──────────────────────────────────────────

  @Post('video-interviews')
  @ApiOperation({ summary: 'Schedule a video interview' })
  scheduleVideoInterview(
    @Body() data: {
      candidateId?: string;
      applicationId?: string;
      interviewerId: string;
      pipelineStageId?: string;
      mandateId?: string;
      scheduledAt: string;
    },
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.videoService.schedule(orgId, data);
  }

  @Get('video-interviews')
  @ApiOperation({ summary: 'List video interviews' })
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  listVideoInterviews(
    @CurrentUser('orgId') orgId: string,
    @Query('mandateId') mandateId?: string,
    @Query('status') status?: string,
  ) {
    return this.videoService.findAll(orgId, { mandateId, status });
  }

  @Get('video-interviews/:id')
  @ApiOperation({ summary: 'Get video interview details' })
  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
  getVideoInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.videoService.findOne(id, orgId);
  }

  @Patch('video-interviews/:id/start')
  @ApiOperation({ summary: 'Start a video interview' })
  startVideoInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.videoService.start(id, orgId);
  }

  @Patch('video-interviews/:id/end')
  @ApiOperation({ summary: 'End a video interview' })
  endVideoInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.videoService.end(id, orgId);
  }

  @Patch('video-interviews/:id/feedback')
  @ApiOperation({ summary: 'Submit feedback for a video interview' })
  submitVideoFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() feedback: {
      technicalScore?: number;
      communicationScore?: number;
      cultureFitScore?: number;
      leadershipScore?: number;
      overallRating?: number;
      recommendation?: string;
      notes?: string;
      strengths?: string;
      weaknesses?: string;
    },
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.videoService.submitFeedback(id, orgId, feedback);
  }

  @Patch('video-interviews/:id/cancel')
  @ApiOperation({ summary: 'Cancel a video interview' })
  cancelVideoInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.videoService.cancel(id, orgId);
  }
}

// ══════════════════════════════════════════════════════════════════
// Candidate-Facing Endpoints (Public / Token-Based Auth)
// ══════════════════════════════════════════════════════════════════

@ApiTags('Assessment Engine (Candidate)')
@Controller('api/v2/assessment-take')
export class AssessmentTakeController {
  constructor(
    private readonly service: AssessmentEngineService,
    private readonly quizService: QuizService,
    private readonly codingService: CodingService,
    private readonly videoService: VideoInterviewService,
  ) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get assessment details by access token (candidate view)' })
  getAssessment(@Param('token') token: string) {
    return this.service.getAttemptByToken(token);
  }

  @Post(':token/start')
  @Public()
  @ApiOperation({ summary: 'Start the assessment timer' })
  startAssessment(@Param('token') token: string, @Req() req: Request) {
    return this.service.startAttempt(
      token,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':token/quiz/submit')
  @Public()
  @ApiOperation({ summary: 'Submit quiz answers' })
  submitQuiz(@Param('token') token: string, @Body() dto: SubmitQuizDto) {
    return this.quizService.submitQuiz(token, dto);
  }

  @Post(':token/code/run')
  @Public()
  @ApiOperation({ summary: 'Run code against sample test cases' })
  runCode(@Param('token') token: string, @Body() dto: RunCodeDto) {
    return this.codingService.runCode(token, dto);
  }

  @Post(':token/code/submit')
  @Public()
  @ApiOperation({ summary: 'Final submit code against all test cases' })
  submitCode(@Param('token') token: string, @Body() dto: SubmitCodeDto) {
    return this.codingService.submitCode(token, dto);
  }

  @Post(':token/code/complete')
  @Public()
  @ApiOperation({ summary: 'Complete the coding assessment' })
  completeCodeAssessment(@Param('token') token: string) {
    return this.codingService.completeCodeAssessment(token);
  }

  @Patch(':token/anti-cheat')
  @Public()
  @ApiOperation({ summary: 'Update anti-cheat metrics (tab switches, fullscreen exits)' })
  updateAntiCheat(
    @Param('token') token: string,
    @Body() dto: UpdateAntiCheatDto,
  ) {
    return this.service.updateAntiCheat(token, dto);
  }

  // ── Video Interview (Candidate Join) ──────────────────────────

  @Get('video/:token')
  @Public()
  @ApiOperation({ summary: 'Get video interview room info by candidate token' })
  getVideoRoom(@Param('token') token: string) {
    return this.videoService.getByToken(token);
  }
}

