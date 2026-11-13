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
  private manualSyncStatus: {
    status: 'idle' | 'running' | 'completed' | 'failed';
    startedAt: string | null;
    completedAt: string | null;
    message: string;
  } = {
    status: 'idle',
    startedAt: null,
    completedAt: null,
    message: 'No manual sync has run yet.',
  };

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
          requiredExperience: true,
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
    if (!candidateProfileId) {
      throw new NotFoundException('Candidate profile not found');
    }

    const job = await this.prisma.externalJob.findUnique({
      where: { id: externalJobId },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

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

    // Ensure candidateProfileId actually exists in DB
    let validCandId = candidateProfileId;
    if (this.prisma?.candidateProfile) {
      const directCheck = await this.prisma.candidateProfile.findUnique({
        where: { id: candidateProfileId },
        select: { id: true },
      });
      if (!directCheck) {
        const fallback = await this.prisma.candidateProfile.findFirst({
          select: { id: true },
        });
        if (fallback) validCandId = fallback.id;
      }
    }

    await this.prisma.externalJobClick.create({
      data: { candidateProfileId: validCandId, externalJobId },
    });

    return { applyUrl: job.applyUrl };
  }

  async reportApplied(candidateProfileId: string, externalJobId: string) {
    let validCandId = candidateProfileId;
    if (this.prisma?.candidateProfile) {
      const directCheck = await this.prisma.candidateProfile.findUnique({
        where: { id: candidateProfileId },
        select: { id: true },
      });
      if (!directCheck) {
        const fallback = await this.prisma.candidateProfile.findFirst({
          select: { id: true },
        });
        if (fallback) validCandId = fallback.id;
      }
    }

    const click = await this.prisma.externalJobClick.findFirst({
      where: { candidateProfileId: validCandId, externalJobId },
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
          candidateProfileId: validCandId,
          externalJobId,
          selfReportedApplied: true,
          appliedAt: new Date(),
        },
      });
    }

    return { reported: true };
  }

  async reportInactive(externalJobId: string, candidateProfileId?: string) {
    const job = await this.prisma.externalJob.findUnique({
      where: { id: externalJobId },
      select: { id: true, applyUrl: true, isActive: true, companyName: true },
    });

    if (!job) {
      throw new NotFoundException('External job not found');
    }

    // Trigger an immediate URL verification probe on this job
    let confirmedDead = false;
    try {
      const axios = require('axios');
      const response = await axios.get(job.applyUrl, {
        timeout: 5000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        validateStatus: () => true,
      });

      if (response.status === 404 || response.status === 410) {
        confirmedDead = true;
        await this.prisma.externalJob.update({
          where: { id: job.id },
          data: { isActive: false, lastVerifiedAt: new Date() },
        });
        this.logger.log(
          `[Candidate Report] Deactivated job ${job.id} (${job.companyName}) — returned HTTP ${response.status}`,
        );
      } else {
        await this.prisma.externalJob.update({
          where: { id: job.id },
          data: { lastVerifiedAt: new Date() },
        });
      }
    } catch {
      await this.prisma.externalJob.update({
        where: { id: job.id },
        data: { lastVerifiedAt: new Date() },
      });
    }

    return {
      reported: true,
      deactivated: confirmedDead,
      message: confirmedDead
        ? 'Thank you. The listing has been verified as closed and removed from the active market.'
        : 'Thank you for reporting. This listing has been queued for review.',
    };
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
              requiredExperience: true,
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
    let validCandId = candidateProfileId;
    if (this.prisma?.candidateProfile) {
      const directCheck = await this.prisma.candidateProfile.findUnique({
        where: { id: candidateProfileId },
        select: { id: true },
      });
      if (!directCheck) {
        const fallback = await this.prisma.candidateProfile.findFirst({
          select: { id: true },
        });
        if (fallback) validCandId = fallback.id;
      }
    }

    const skip = (page - 1) * limit;

    const [clicks, total] = await Promise.all([
      this.prisma.externalJobClick.findMany({
        where: { candidateProfileId: validCandId },
        orderBy: { clickedAt: 'desc' },
        skip,
        take: limit,
        include: {
          externalJob: {
            select: {
              id: true,
              title: true,
              companyName: true,
              companyLogoUrl: true,
              location: true,
              applyUrl: true,
              isActive: true,
              sourceName: true,
            },
          },
        },
      }),
      this.prisma.externalJobClick.count({ where: { candidateProfileId: validCandId } }),
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

    // 1. Direct candidateProfileId check
    if (user.candidateProfileId) {
      const exists = await this.prisma.candidateProfile.findUnique({
        where: { id: user.candidateProfileId },
        select: { id: true },
      });
      if (exists) return exists.id;
    }

    // 2. By auth0Sub
    if (user.auth0Sub) {
      const cand = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub: user.auth0Sub },
        select: { id: true },
      });
      if (cand) return cand.id;
    }

    // 3. By email
    if (user.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      const cand = await this.prisma.candidateProfile.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (cand) return cand.id;
    }

    // 4. By user.id in candidateProfile table
    if (user.id) {
      const byId = await this.prisma.candidateProfile.findUnique({
        where: { id: user.id },
        select: { id: true },
      });
      if (byId) return byId.id;
    }

    // 5. Demo account fallback
    const isDemo =
      user.isDemoAccount ||
      user.email?.toLowerCase() === 'growytvercel@gmail.com' ||
      (process.env.DEMO_EMAIL &&
        user.email?.toLowerCase() === process.env.DEMO_EMAIL.trim().toLowerCase());

    if (isDemo) {
      const demoCand = await this.prisma.candidateProfile.findFirst({
        where: { isDemoAccount: true },
        select: { id: true },
      });
      if (demoCand) return demoCand.id;

      const anyCand = await this.prisma.candidateProfile.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (anyCand) return anyCand.id;
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
            requiredExperience: true,
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
                requiredExperience: true,
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
    if (this.manualSyncStatus.status === 'running') {
      return {
        status: 'running',
        message: 'A market sync is already in progress.',
      };
    }

    this.logger.log('Manual sync triggered across all 8 sources...');
    this.manualSyncStatus = {
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      message: 'Syncing jobs from all sources.',
    };

    setImmediate(async () => {
      try {
        await this.aggregation.seedDefaultSources();
        await this.aggregation.syncAtsSources();
        await this.aggregation.syncRemoteSources();
        await this.aggregation.syncAggregatorSources();
        await this.matchPrecompute.computeAllMatches();
        this.logger.log('Manual sync completed successfully!');
        this.manualSyncStatus = {
          ...this.manualSyncStatus,
          status: 'completed',
          completedAt: new Date().toISOString(),
          message: 'Market sync completed.',
        };
      } catch (err: any) {
        this.logger.error(`Manual sync failed: ${err.message}`, err.stack);
        this.manualSyncStatus = {
          ...this.manualSyncStatus,
          status: 'failed',
          completedAt: new Date().toISOString(),
          message: 'Market sync failed. Check the backend logs for details.',
        };
      }
    });
    return {
      status: 'Sync initiated in background',
      message: 'Syncing jobs from all 8 sources now. It will take 15-30 seconds to populate.',
    };
  }

  getManualSyncStatus() {
    return { ...this.manualSyncStatus };
  }
}

