import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AggregationService } from './services/aggregation.service';
import { MatchPrecomputeService } from './services/match-precompute.service';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { IsString, IsOptional } from 'class-validator';

class AddSourceDto {
  @IsString()
  sourceName: string;

  @IsString()
  companySlug: string;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyLogoUrl?: string;
}

@Controller('api/v1/admin/external-jobs')
@UserTypes('PLATFORM_ADMIN')
export class ExternalJobsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregation: AggregationService,
    private readonly matchPrecompute: MatchPrecomputeService,
  ) {}

  @Get('sources')
  async getSources() {
    const sources = await this.prisma.jobSourceConfig.findMany({
      orderBy: [{ sourceName: 'asc' }, { companyName: 'asc' }],
    });
    return { sources };
  }

  @Post('sources')
  async addSource(@Body() dto: AddSourceDto) {
    const source = await this.prisma.jobSourceConfig.upsert({
      where: {
        sourceName_companySlug: {
          sourceName: dto.sourceName,
          companySlug: dto.companySlug,
        },
      },
      create: {
        sourceName: dto.sourceName,
        companySlug: dto.companySlug,
        companyName: dto.companyName,
        companyLogoUrl: dto.companyLogoUrl,
      },
      update: {
        companyName: dto.companyName,
        companyLogoUrl: dto.companyLogoUrl,
        isActive: true,
      },
    });
    return { source };
  }

  @Delete('sources/:id')
  async removeSource(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.jobSourceConfig.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: true };
  }

  @Post('sync/ats')
  async triggerAtsSync() {
    const results = await this.aggregation.syncAtsSources();
    return { results };
  }

  @Post('sync/remote')
  async triggerRemoteSync() {
    const results = await this.aggregation.syncRemoteSources();
    return { results };
  }

  @Post('sync/aggregators')
  async triggerAggregatorSync() {
    const results = await this.aggregation.syncAggregatorSources();
    return { results };
  }

  @Post('sync/all')
  async triggerFullSync() {
    const [ats, remote, aggregators] = await Promise.all([
      this.aggregation.syncAtsSources(),
      this.aggregation.syncRemoteSources(),
      this.aggregation.syncAggregatorSources(),
    ]);
    return { ats, remote, aggregators };
  }

  @Post('match-compute')
  async triggerMatchCompute() {
    const result = await this.matchPrecompute.computeAllMatches();
    return { result };
  }

  @Get('health')
  async getHealth() {
    const circuitBreakers = this.aggregation.getCircuitBreakerStatus();
    return { circuitBreakers };
  }
}
