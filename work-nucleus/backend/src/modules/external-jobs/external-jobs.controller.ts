import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ExternalJobsService } from './external-jobs.service';
import { SearchExternalJobsDto } from './dto/search-external-jobs.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';

@Controller('api/v1/external-jobs')
export class ExternalJobsController {
  constructor(private readonly service: ExternalJobsService) {}

  private async getCandidateId(user: any): Promise<string | null> {
    if (!user) return null;
    if (user.candidateProfileId) return user.candidateProfileId;
    if (user.userType === 'CANDIDATE' && user.id) return user.id;
    if (this.service.resolveCandidateId) {
      return this.service.resolveCandidateId(user);
    }
    return user.id || null;
  }

  @Get()
  @UserTypes('CANDIDATE')
  async searchJobs(
    @Query() dto: SearchExternalJobsDto,
    @CurrentUser() user: any,
  ) {
    const candidateId = await this.getCandidateId(user);
    return this.service.searchJobs(dto, candidateId || undefined);
  }

  @Get('recommended')
  @UserTypes('CANDIDATE')
  async getRecommended(@CurrentUser() user: any) {
    const candidateId = await this.getCandidateId(user);
    if (!candidateId) {
      return { jobs: [], message: 'Complete your profile to get recommendations' };
    }
    const jobs = await this.service.getRecommendedJobs(candidateId);
    return { jobs };
  }

  @Get('saved')
  @UserTypes('CANDIDATE')
  async getSavedJobs(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const candidateId = await this.getCandidateId(user);
    if (!candidateId) {
      return {
        savedJobs: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    }
    return this.service.getSavedJobs(
      candidateId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('history')
  @UserTypes('CANDIDATE')
  async getClickHistory(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const candidateId = await this.getCandidateId(user);
    if (!candidateId) {
      return {
        history: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    }
    return this.service.getClickHistory(
      candidateId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('stats')
  @UserTypes('PLATFORM_ADMIN')
  async getStats() {
    return this.service.getStats();
  }

  @Post('sync')
  @UserTypes('CANDIDATE', 'PLATFORM_ADMIN')
  async triggerSync() {
    return this.service.triggerManualSync();
  }

  @Get(':id')
  @UserTypes('CANDIDATE')
  async getJobById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const candidateId = await this.getCandidateId(user);
    return this.service.getJobById(id, candidateId || undefined);
  }

  @Post(':id/save')
  @UserTypes('CANDIDATE')
  async toggleSave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const candidateId = await this.getCandidateId(user);
    if (!candidateId) {
      throw new UnauthorizedException('Candidate profile required');
    }
    return this.service.toggleSave(candidateId, id);
  }

  @Post(':id/click')
  @UserTypes('CANDIDATE')
  async recordClick(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const candidateId = await this.getCandidateId(user);
    if (!candidateId) {
      throw new UnauthorizedException('Candidate profile required');
    }
    return this.service.recordClick(candidateId, id);
  }

  @Patch(':id/applied')
  @UserTypes('CANDIDATE')
  async reportApplied(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const candidateId = await this.getCandidateId(user);
    if (!candidateId) {
      throw new UnauthorizedException('Candidate profile required');
    }
    return this.service.reportApplied(candidateId, id);
  }
}
