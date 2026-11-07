import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExternalJobsService } from './external-jobs.service';
import { SearchExternalJobsDto } from './dto/search-external-jobs.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';

@Controller('api/v1/external-jobs')
export class ExternalJobsController {
  constructor(private readonly service: ExternalJobsService) {}

  @Get()
  @UserTypes('CANDIDATE')
  async searchJobs(
    @Query() dto: SearchExternalJobsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.searchJobs(dto, user?.candidateProfileId);
  }

  @Get('recommended')
  @UserTypes('CANDIDATE')
  async getRecommended(@CurrentUser() user: any) {
    if (!user?.candidateProfileId) {
      return { jobs: [], message: 'Complete your profile to get recommendations' };
    }
    const jobs = await this.service.getRecommendedJobs(user.candidateProfileId);
    return { jobs };
  }

  @Get('saved')
  @UserTypes('CANDIDATE')
  async getSavedJobs(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getSavedJobs(
      user.candidateProfileId,
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
    return this.service.getClickHistory(
      user.candidateProfileId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('stats')
  @UserTypes('PLATFORM_ADMIN')
  async getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @UserTypes('CANDIDATE')
  async getJobById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getJobById(id, user?.candidateProfileId);
  }

  @Post(':id/save')
  @UserTypes('CANDIDATE')
  async toggleSave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.toggleSave(user.candidateProfileId, id);
  }

  @Post(':id/click')
  @UserTypes('CANDIDATE')
  async recordClick(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.recordClick(user.candidateProfileId, id);
  }

  @Patch(':id/applied')
  @UserTypes('CANDIDATE')
  async reportApplied(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.reportApplied(user.candidateProfileId, id);
  }
}

