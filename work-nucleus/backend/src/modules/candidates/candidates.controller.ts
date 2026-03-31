import {
  Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { JobQueueService } from '../job-queue/job-queue.service';

@ApiTags('Candidates')
@ApiBearerAuth()
@Controller('api/v1/candidates')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER, Role.INTERVIEWER)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly queue: JobQueueService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a candidate' })
  create(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateCandidateDto,
  ) {
    return this.candidatesService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List candidates' })
  findAll(
    @CurrentUser('orgId') orgId: string,
    @Query() query: QueryCandidatesDto,
  ) {
    return this.candidatesService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get candidate detail' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.candidatesService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a candidate' })
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.candidatesService.update(orgId, id, dto);
  }

  @Post('trigger-scoring')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Manually trigger AI resume scoring for all unscored applications' })
  async triggerScoring() {
    const jobId = await this.queue.enqueue('resume-scoring-nightly', {});
    return { message: 'Resume scoring triggered', jobId };
  }
}
