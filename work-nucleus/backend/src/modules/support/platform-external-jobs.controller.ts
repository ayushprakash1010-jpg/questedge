import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AggregationService } from '../external-jobs/services/aggregation.service';
import { ExternalJobsService } from '../external-jobs/external-jobs.service';

@ApiTags('Platform External Jobs (Support Admin)')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support/external-jobs')
export class PlatformExternalJobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly aggregation: AggregationService,
    private readonly externalJobsService: ExternalJobsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get external jobs platform statistics' })
  async getStats() {
    const [total, active, inactive, sourcesBreakdown] = await Promise.all([
      this.prisma.externalJob.count(),
      this.prisma.externalJob.count({ where: { isActive: true } }),
      this.prisma.externalJob.count({ where: { isActive: false } }),
      this.prisma.externalJob.groupBy({
        by: ['sourceName'],
        _count: { id: true },
      }),
    ]);

    const circuitBreakers = this.aggregation.getCircuitBreakerStatus();
    const syncStatus = this.externalJobsService.getManualSyncStatus();

    return {
      total,
      active,
      inactive,
      sources: sourcesBreakdown.map((s) => ({
        sourceName: s.sourceName,
        count: s._count.id,
      })),
      circuitBreakers,
      syncStatus,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List external jobs with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sourceName', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async listJobs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sourceName') sourceName?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (sourceName) {
      where.sourceName = sourceName;
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [jobs, total] = await Promise.all([
      this.prisma.externalJob.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          companyName: true,
          companyLogoUrl: true,
          location: true,
          isRemote: true,
          workplaceType: true,
          sourceName: true,
          applyUrl: true,
          isActive: true,
          postedAt: true,
          lastVerifiedAt: true,
          lastSyncedAt: true,
        },
      }),
      this.prisma.externalJob.count({ where }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Post('verify-urls')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Run on-demand URL health verification & deactivation' })
  async verifyUrls(@Body('batchSize') batchSize?: number) {
    const count = batchSize && batchSize > 0 ? Math.min(batchSize, 100) : 30;
    const startTime = Date.now();
    const result = await this.aggregation.verifyJobUrls(count);
    return {
      ...result,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('sync')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Trigger market sync across all job sources' })
  async triggerSync() {
    return this.externalJobsService.triggerManualSync();
  }

  @Get('sync-status')
  @ApiOperation({ summary: 'Get current status of market sync' })
  async getSyncStatus() {
    return this.externalJobsService.getManualSyncStatus();
  }

  @Patch(':id/toggle')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Toggle active status of an external job' })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const job = await this.prisma.externalJob.findUniqueOrThrow({
      where: { id },
    });

    const newStatus = !job.isActive;
    const updated = await this.prisma.externalJob.update({
      where: { id },
      data: {
        isActive: newStatus,
        lastVerifiedAt: new Date(),
      },
    });

    await this.audit.log({
      orgId: 'platform',
      userId: req.user?.id || 'support-admin',
      action: newStatus ? 'EXTERNAL_JOB_ACTIVATED' : 'EXTERNAL_JOB_DEACTIVATED',
      entityType: 'EXTERNAL_JOB',
      entityId: id,
      changes: {
        before: { isActive: job.isActive },
        after: { isActive: newStatus },
        title: job.title,
        companyName: job.companyName,
        reason: reason || 'Manual toggle from Support Admin',
      },
    });

    return { success: true, job: updated };
  }
}
