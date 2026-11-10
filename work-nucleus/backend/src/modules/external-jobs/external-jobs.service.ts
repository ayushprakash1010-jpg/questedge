import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HotCacheService } from '../cache/cache.service';
import { AggregationService } from './services/aggregation.service';
import { MatchPrecomputeService } from './services/match-precompute.service';
import { SearchExternalJobsDto } from './dto/search-external-jobs.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExternalJobsService {
  private readonly logger = new Logger(ExternalJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: HotCacheService,
    private readonly aggregation: AggregationService,
    private readonly matchPrecompute: MatchPrecomputeService,
  ) {}

  async searchJobs(dto: SearchExternalJobsDto, candidateProfileId?: string) {
    const { limit = 20, page = 1 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ExternalJobWhereInput = { isActive: true };

    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { companyName: { contains: dto.search, mode: 'insensitive' } },
        { descriptionSnippet: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.location) {
      const locFilter = [
        { city: { contains: dto.location, mode: 'insensitive' as const } },
        { state: { contains: dto.location, mode: 'insensitive' as const } },
        { location: { contains: dto.location, mode: 'insensitive' as const } },
      ];
      if (where.OR) {
        // Both search + location: wrap in AND
        where.AND = [{ OR: where.OR }, { OR: locFilter }];
        delete where.OR;
      } else {
        where.OR = locFilter;
      }
    }

    if (dto.workplaceType) where.workplaceType = dto.workplaceType;
    if (dto.experienceLevel) where.experienceLevel = dto.experienceLevel;
    if (dto.employmentType) where.employmentType = dto.employmentType;
    if (dto.sourceName) where.sourceName = dto.sourceName;
    if (dto.salaryMin) where.salaryMax = { gte: dto.salaryMin };
    if (dto.salaryMax) where.salaryMin = { lte: dto.salaryMax };

    if (dto.postedWithin) {
      const now = new Date();
      const cutoff = new Date();
      switch (dto.postedWithin) {
        case '24h': cutoff.setHours(now.getHours() - 24); break;
        case '3d': cutoff.setDate(now.getDate() - 3); break;
        case '7d': cutoff.setDate(now.getDate() - 7); break;
        case '14d': cutoff.setDate(now.getDate() - 14); break;
        case '30d': cutoff.setDate(now.getDate() - 30); break;
      }
      where.postedAt = { gte: cutoff };
    }

    let orderBy: Prisma.ExternalJobOrderByWithRelationInput = {
      postedAt: 'desc',
    };
    if (dto.sortBy === 'salary') orderBy = { salaryMax: 'desc' };

    const [jobs, total] = await Promise.all([
      this.prisma.externalJob.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          sourceName: true,
          sourceId: true,
          title: true,
          companyName: true,
          companyLogoUrl: true,
          location: true,
          city: true,
          state: true,
          country: true,
          isRemote: true,
          workplaceType: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
          salaryRaw: true,
          descriptionSnippet: true,
          employmentType: true,
          department: true,
          extractedSkills: true,
          tags: true,
          experienceLevel: true,
          applyUrl: true,
          postedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.externalJob.count({ where }),
    ]);

    // Attach match scores if candidate is authenticated
    let jobsWithScores = jobs as any[];
    if (candidateProfileId) {
      const jobIds = jobs.map((j) => j.id);
      const matches = await this.prisma.externalJobMatch.findMany({
        where: {
          candidateProfileId,
          externalJobId: { in: jobIds },
        },
        select: {
          externalJobId: true,
          totalScore: true,
          matchedSkills: true,
        },
      });

      const matchMap = new Map(matches.map((m) => [m.externalJobId, m]));
      jobsWithScores = jobs.map((job) => ({
        ...job,
        matchScore: matchMap.get(job.id)?.totalScore || null,
        matchedSkills: matchMap.get(job.id)?.matchedSkills || null,
      }));
    }

    return {
      jobs: jobsWithScores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  }

  async getJobById(id: string, candidateProfileId?: string) {
    const job = await this.prisma.externalJob.findUnique({ where: { id } });

    if (!job || !job.isActive) {
      throw new NotFoundException('Job not found or no longer active');
    }

    let matchData = null;
    let isSaved = false;

    if (candidateProfileId) {
      [matchData, isSaved] = await Promise.all([
        this.prisma.externalJobMatch
          .findUnique({
            where: {
              candidateProfileId_externalJobId: {
                candidateProfileId,
                externalJobId: id,
              },
            },
          })
          .then((m) => m || null),
        this.prisma.externalSavedJob
          .findUnique({
            where: {
              candidateProfileId_externalJobId: {
                candidateProfileId,
                externalJobId: id,
              },
            },
          })
          .then((s) => !!s),
      ]);
    }

    return { ...job, matchData, isSaved };
  }

  async toggleSave(candidateProfileId: string, externalJobId: string) {
    const existing = await this.prisma.externalSavedJob.findUnique({
      where: {
        candidateProfileId_externalJobId: {
          candidateProfileId,
          externalJobId,
        },
      },
    });

    if (existing) {
      await this.prisma.externalSavedJob.delete({
        where: { id: existing.id },
      });
      return { saved: false };
    }

    await this.prisma.externalSavedJob.create({
      data: { candidateProfileId, externalJobId },
    });
    return { saved: true };
  }

  async recordClick(candidateProfileId: string, externalJobId: string) {
    const job = await this.prisma.externalJob.findUnique({
      where: { id: externalJobId },
      select: { applyUrl: true },
    });

    if (!job) throw new NotFoundException('Job not found');

    await this.prisma.externalJobClick.create({
      data: { candidateProfileId, externalJobId },
    });

    return { applyUrl: job.applyUrl };
  }

  async reportApplied(candidateProfileId: string, externalJobId: string) {
    const click = await this.prisma.externalJobClick.findFirst({
      where: { candidateProfileId, externalJobId },
      orderBy: { clickedAt: 'desc' },
    });

    if (click) {
      await this.prisma.externalJobClick.update({
        where: { id: click.id },
        data: { selfReportedApplied: true, appliedAt: new Date() },
      });
    } else {
      await this.prisma.externalJobClick.create({
        data: {
          candidateProfileId,
          externalJobId,
          selfReportedApplied: true,
          appliedAt: new Date(),
        },
      });
    }

    return { reported: true };
  }

  async getSavedJobs(candidateProfileId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [saves, total] = await Promise.all([
      this.prisma.externalSavedJob.findMany({
        where: { candidateProfileId },
        orderBy: { savedAt: 'desc' },
        skip,
        take: limit,
        include: {
          externalJob: {
            select: {
              id: true,
              sourceName: true,
              title: true,
              companyName: true,
              companyLogoUrl: true,
              location: true,
              isRemote: true,
              workplaceType: true,
              salaryMin: true,
              salaryMax: true,
              salaryCurrency: true,
              salaryRaw: true,
              descriptionSnippet: true,
              employmentType: true,
              extractedSkills: true,
              applyUrl: true,
              postedAt: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.externalSavedJob.count({ where: { candidateProfileId } }),
    ]);

    return {
      savedJobs: saves.map((s) => ({
        ...s.externalJob,
        savedAt: s.savedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClickHistory(candidateProfileId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [clicks, total] = await Promise.all([
      this.prisma.externalJobClick.findMany({
        where: { candidateProfileId },
        orderBy: { clickedAt: 'desc' },
        skip,
        take: limit,
        include: {
          externalJob: {
            select: {
              id: true,
              title: true,
              companyName: true,
              location: true,
              applyUrl: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.externalJobClick.count({ where: { candidateProfileId } }),
    ]);

    return {
      history: clicks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveCandidateId(user: any): Promise<string | null> {
    if (!user) return null;
    if (user.candidateProfileId) return user.candidateProfileId;
    if (user.userType === 'CANDIDATE' && user.id) return user.id;

    if (user.auth0Sub) {
      const cand = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub: user.auth0Sub },
        select: { id: true },
      });
      if (cand) return cand.id;
    }

    if (user.email) {
      const cand = await this.prisma.candidateProfile.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { id: true },
      });
      if (cand) return cand.id;
    }

    // Demo account fallback: get first active candidate profile
    const isDemo =
      user.isDemoAccount ||
      user.email?.toLowerCase() === 'growytvercel@gmail.com';
    if (isDemo) {
      const demoCand = await this.prisma.candidateProfile.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (demoCand) return demoCand.id;
    }

    return user.id || null;
  }

  async getRecommendedJobs(candidateProfileId: string, limit = 20) {
    let matches = await this.prisma.externalJobMatch.findMany({
      where: {
        candidateProfileId,
        externalJob: { isActive: true },
      },
      orderBy: { totalScore: 'desc' },
      take: limit,
      include: {
        externalJob: {
          select: {
            id: true,
            sourceName: true,
            title: true,
            companyName: true,
            companyLogoUrl: true,
            location: true,
            isRemote: true,
            workplaceType: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryRaw: true,
            descriptionSnippet: true,
            employmentType: true,
            extractedSkills: true,
            applyUrl: true,
            postedAt: true,
          },
        },
      },
    });

    // If no precomputed matches exist, compute on demand!
    if (matches.length === 0) {
      const candidate = await this.prisma.candidateProfile.findUnique({
        where: { id: candidateProfileId },
      });
      if (candidate) {
        await this.matchPrecompute.computeMatchesForCandidate(candidate);
        matches = await this.prisma.externalJobMatch.findMany({
          where: {
            candidateProfileId,
            externalJob: { isActive: true },
          },
          orderBy: { totalScore: 'desc' },
          take: limit,
          include: {
            externalJob: {
              select: {
                id: true,
                sourceName: true,
                title: true,
                companyName: true,
                companyLogoUrl: true,
                location: true,
                isRemote: true,
                workplaceType: true,
                salaryMin: true,
                salaryMax: true,
                salaryCurrency: true,
                salaryRaw: true,
                descriptionSnippet: true,
                employmentType: true,
                extractedSkills: true,
                applyUrl: true,
                postedAt: true,
              },
            },
          },
        });
      }
    }

    return matches.map((m) => ({
      ...m.externalJob,
      matchScore: m.totalScore,
      skillsScore: m.skillsScore,
      experienceScore: m.experienceScore,
      roleFitScore: m.roleFitScore,
      preferencesScore: m.preferencesScore,
      matchedSkills: m.matchedSkills,
      missingSkills: m.missingSkills,
    }));
  }

  async getStats() {
    const [totalJobs, activeJobs, sourceBreakdown, totalClicks, totalSaves] =
      await Promise.all([
        this.prisma.externalJob.count(),
        this.prisma.externalJob.count({ where: { isActive: true } }),
        this.prisma.externalJob.groupBy({
          by: ['sourceName'],
          where: { isActive: true },
          _count: { id: true },
        }),
        this.prisma.externalJobClick.count(),
        this.prisma.externalSavedJob.count(),
      ]);

    return {
      totalJobs,
      activeJobs,
      sourceBreakdown: sourceBreakdown.map((s) => ({
        source: s.sourceName,
        count: s._count.id,
      })),
      totalClicks,
      totalSaves,
    };
  }

  async triggerManualSync() {
    this.logger.log('Manual sync triggered across all 8 sources...');
    setImmediate(async () => {
      try {
        await this.aggregation.seedDefaultSources();
        await this.aggregation.syncAtsSources();
        await this.aggregation.syncRemoteSources();
        await this.aggregation.syncAggregatorSources();
        await this.matchPrecompute.computeAllMatches();
        this.logger.log('Manual sync completed successfully!');
      } catch (err: any) {
        this.logger.error(`Manual sync failed: ${err.message}`, err.stack);
      }
    });
    return {
      status: 'Sync initiated in background',
      message: 'Syncing jobs from all 8 sources now. It will take 15-30 seconds to populate.',
    };
  }
}

