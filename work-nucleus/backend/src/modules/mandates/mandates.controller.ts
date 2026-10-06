import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MandatesService } from './mandates.service';
import { CreateMandateDto } from './dto/create-mandate.dto';
import { UpdateMandateDto } from './dto/update-mandate.dto';
import { FilterMandateDto } from './dto/filter-mandate.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { AiScreeningService } from '../ai-screening/ai-screening.service';

@ApiTags('Mandates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/mandates')
export class MandatesController {
  constructor(
    private readonly mandatesService: MandatesService,
    private readonly aiScreening: AiScreeningService,
  ) {}

  // ── Public: Browse active mandates (no auth required) ─────────

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public: Browse all ACTIVE mandates on the marketplace (no auth required)' })
  async publicDiscover(@Query() filter: FilterMandateDto) {
    return this.mandatesService.publicDiscover(filter);
  }

  // ── Company: Generate Mandate ────────────────────────────────

  @Get('test-ai')
  @Public()
  async testAi() {
    return this.aiScreening.generateMandate('We need a Senior Full-Stack Engineer with React and Node.');
  }

  @Post('generate')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Generate a mandate using AI' })
  async generateMandate(@Body() body: { prompt: string }) {
    if (!body.prompt || body.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required');
    }
    return this.aiScreening.generateMandate(body.prompt);
  }

  // ── Company: Create ──────────────────────────────────────────

  @Post()
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Create a new mandate (starts as DRAFT)' })
  @ApiResponse({ status: 201, description: 'Mandate created successfully' })
  @ApiResponse({ status: 403, description: 'Not a company user' })
  async create(@CurrentUser() user: any, @Body() dto: CreateMandateDto) {
    return this.mandatesService.create(user.orgId, dto);
  }

  // ── Company: Get own mandates ────────────────────────────────

  @Get()
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: List own mandates with filters and pagination' })
  async findByOrg(@CurrentUser() user: any, @Query() filter: FilterMandateDto) {
    return this.mandatesService.findByOrg(user.orgId, filter);
  }

  // ── Recruiter: Discovery ─────────────────────────────────────

  @Get('discover')
  @UserTypes(UserType.RECRUITER, UserType.CANDIDATE)
  @ApiOperation({ summary: 'Recruiter/Candidate: Browse all ACTIVE mandates on the marketplace' })
  async discover(@CurrentUser() user: any, @Query() filter: FilterMandateDto) {
    const recruiterId = user.userType === UserType.RECRUITER ? user.id : undefined;
    return this.mandatesService.discover(recruiterId ?? '', filter);
  }

  // ── Recruiter: My active mandates ───────────────────────────

  @Get('my-active')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Get mandates I am actively working on' })
  async findByRecruiter(@CurrentUser() user: any, @Query() filter: FilterMandateDto) {
    return this.mandatesService.findByRecruiter(user.id, filter);
  }

  // ── Company: Get single mandate with stats ───────────────────

  @Get(':id')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER, UserType.RECRUITER, UserType.CANDIDATE)
  @ApiOperation({ summary: 'Get mandate detail (Company sees full stats, Recruiters see marketplace details)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (user.userType === UserType.RECRUITER || user.userType === UserType.CANDIDATE) {
      const recruiterId = user.userType === UserType.RECRUITER ? user.id : undefined;
      return this.mandatesService.findForMarketplace(id, recruiterId);
    }
    return this.mandatesService.findOne(user.orgId, id);
  }

  // ── Company: Update mandate ──────────────────────────────────

  @Patch(':id')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Update a mandate (not allowed when CLOSED/FILLED)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMandateDto,
  ) {
    return this.mandatesService.update(user.orgId, id, dto);
  }

  // ── Company: Publish ─────────────────────────────────────────

  @Post(':id/publish')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Company Admin: Publish a DRAFT or PAUSED mandate to the marketplace' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async publish(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.publish(user.orgId, id);
  }

  // ── Company: Pause ───────────────────────────────────────────

  @Post(':id/pause')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Company Admin: Pause an ACTIVE mandate' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async pause(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.pause(user.orgId, id);
  }

  // ── Company: Close ───────────────────────────────────────────

  @Post(':id/close')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Company Admin: Close a mandate permanently' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async close(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.close(user.orgId, id);
  }

  // ── Company: Delete ──────────────────────────────────────────

  @Delete(':id')
  @UserTypes(UserType.COMPANY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Company Admin: Delete a DRAFT mandate (cannot delete published)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.remove(user.orgId, id);
  }

  // ── Recruiter: Join mandate ──────────────────────────────────

  @Post(':id/join')
  @UserTypes(UserType.RECRUITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recruiter: Opt-in to work on a mandate (appear in its recruiter pool)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async joinMandate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.joinMandate(user.id, id);
  }

  // ── Recruiter: Leave mandate ─────────────────────────────────

  @Delete(':id/leave')
  @UserTypes(UserType.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Recruiter: Leave a mandate (stop working on it)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async leaveMandate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.leaveMandate(user.id, id);
  }

  // ── Company: View participants ───────────────────────────────

  @Get(':id/participants')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: View recruiters currently working on a mandate' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getParticipants(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.getParticipants(user.orgId, id);
  }

  // ── Company: Pipeline ──────────────────────────────────────────

  @Get(':id/pipeline')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: Fetch all applications/referrals for a mandate pipeline' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getPipeline(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.getPipeline(user.orgId, id);
  }

  // Company: Referral Inbox

  @Get(':id/referrals')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Company: List all referrals for a mandate with candidate and recruiter details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getMandateReferrals(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mandatesService.getMandateReferrals(user.orgId, id);
  }

  @Patch(':id/referrals/:referralId/status')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Company: Move a referral through the hiring pipeline' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'referralId', type: 'string', format: 'uuid' })
  async updateReferralStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('referralId', ParseUUIDPipe) referralId: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.mandatesService.updateReferralStatus(user.orgId, id, referralId, body.status, body.notes);
  }

  @Post(':id/referrals/:referralId/trigger-ai')
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Company: Retry AI Scoring for a Referral' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'referralId', type: 'string', format: 'uuid' })
  async retryAiScoring(
    @Param('referralId', ParseUUIDPipe) referralId: string,
  ) {
    await this.aiScreening.evaluateReferralFit(referralId);
    return { success: true };
  }
}
