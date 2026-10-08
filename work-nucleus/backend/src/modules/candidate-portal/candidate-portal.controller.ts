import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { CandidatePortalService } from './candidate-portal.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import {
  UpsertCandidateProfileDto,
  DirectApplyDto,
  ConsentResponseDto,
} from './dto/candidate-portal.dto';
import { FilterMandateDto } from '../mandates/dto/filter-mandate.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('Candidate Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/candidate')
export class CandidatePortalController {
  constructor(
    private readonly candidatePortalService: CandidatePortalService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // ── Profile ──────────────────────────────────────────────────────
  // No @UserTypes restriction — any authenticated user can manage their own
  // CandidateProfile. The service isolates by auth0Sub; a user without a
  // CandidateProfile will receive a 404 from getMyProfile().

  @Post('profile')
  @ApiOperation({ summary: 'Create or update global candidate profile (idempotent upsert)' })
  async upsertProfile(@CurrentUser() user: any, @Body() dto: UpsertCandidateProfileDto) {
    const emailToUse = user.email && !user.email.includes('@placeholder.com') ? user.email : dto.fallbackEmail;
    return this.candidatePortalService.upsertProfile(user.auth0Sub, emailToUse, dto);
  }

  @Post('profile/parse-resume')
  @ApiOperation({ summary: 'Parse raw resume text using Gemini AI' })
  async parseResume(@Body() body: { text: string }) {
    if (!body.text) return {};
    return this.candidatePortalService.parseResumeText(body.text);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get own candidate profile' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.candidatePortalService.getMyProfile(user.auth0Sub);
  }

  @Patch('profile/resume')
  @ApiOperation({ summary: 'Update resume URL after file upload' })
  async updateResume(@CurrentUser() user: any, @Body('resumeUrl') resumeUrl: string) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.updateResume(profile.id, resumeUrl);
  }

  @Post('profile/upload-resume')
  @ApiOperation({ summary: 'Upload resume PDF/DOCX directly — stores to S3 and saves URL' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('resume'))
  async uploadResumeDirect(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    const resumeKey = await this.fileUploadService.uploadResume(file, profile.id);
    await this.candidatePortalService.updateResume(profile.id, resumeKey);
    return { resumeUrl: resumeKey, message: 'Resume uploaded successfully' };
  }

  // ── Job Discovery ─────────────────────────────────────────────────

  @Get('jobs')
  @ApiOperation({ summary: 'Browse active mandates with filters and saved status' })
  async discoverJobs(@CurrentUser() user: any, @Query() filter: FilterMandateDto) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.discoverJobs(profile.id, filter);
  }

  @Post('jobs/:mandateId/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle save/unsave a job' })
  @ApiParam({ name: 'mandateId', type: 'string', format: 'uuid' })
  async toggleSaveJob(@CurrentUser() user: any, @Param('mandateId') mandateId: string) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.toggleSaveJob(profile.id, mandateId);
  }

  @Get('jobs/saved')
  @ApiOperation({ summary: 'Get saved jobs list' })
  async getSavedJobs(@CurrentUser() user: any) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.getSavedJobs(profile.id);
  }

  @Post('jobs/:mandateId/apply')
  @ApiOperation({ summary: 'Apply directly to a mandate' })
  @ApiParam({ name: 'mandateId', type: 'string', format: 'uuid' })
  async applyDirectly(
    @CurrentUser() user: any,
    @Param('mandateId') mandateId: string,
    @Body() dto: DirectApplyDto,
  ) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.applyDirectly(profile.id, mandateId, dto);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all applications and active referrals for candidate' })
  async getMyApplications(@CurrentUser() user: any) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.getMyApplications(profile.id);
  }

  // ── Consent ───────────────────────────────────────────────────────

  @Get('consents')
  @ApiOperation({ summary: 'Get all pending consent requests (referrals waiting for response)' })
  async getPendingConsents(@CurrentUser() user: any) {
    const profile = await this.candidatePortalService.getMyProfile(user.auth0Sub);
    return this.candidatePortalService.getPendingConsents(profile.id);
  }

  @Get('consents/:token/preview')
  @Public()
  @ApiOperation({ summary: 'PUBLIC: Preview a consent request (no auth required)' })
  @ApiResponse({ status: 200, description: 'Consent request details returned' })
  @ApiResponse({ status: 404, description: 'Invalid consent token' })
  @ApiResponse({ status: 410, description: 'Consent request has expired' })
  async previewConsent(@Param('token') token: string) {
    return this.candidatePortalService.previewConsent(token);
  }

  @Post('consents/:token/respond')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PUBLIC: Respond to a referral consent via tokenized email link (no auth required)',
    description:
      'Candidates respond via a secure link emailed to them. The consent token is single-use and expires after 7 days.',
  })
  @ApiResponse({ status: 200, description: 'Consent response recorded successfully' })
  @ApiResponse({ status: 400, description: 'Already responded to this consent' })
  @ApiResponse({ status: 404, description: 'Invalid consent token' })
  @ApiResponse({ status: 410, description: 'Consent request has expired' })
  async respondToConsent(
    @Param('token') token: string,
    @Body() dto: ConsentResponseDto,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.candidatePortalService.respondToConsent(token, dto.accepted, ipAddress);
  }
}
