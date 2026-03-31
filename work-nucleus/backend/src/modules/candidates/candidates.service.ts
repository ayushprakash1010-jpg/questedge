import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findUnique({
      where: { orgId_email: { orgId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('A candidate with this email already exists in your organization');
    }

    return this.prisma.candidate.create({
      data: {
        ...dto,
        orgId,
        experienceYears: dto.experienceYears ? new Prisma.Decimal(dto.experienceYears) : null,
        expectedCtc: dto.expectedCtc ? new Prisma.Decimal(dto.expectedCtc) : null,
      },
    });
  }

  async findAll(orgId: string, query: QueryCandidatesDto) {
    const {
      page = 1,
      limit = 20,
      q,
      source,
      hiringPlanId,
      topN,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.CandidateWhereInput = { orgId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (source) where.source = source;
    if (hiringPlanId) {
      where.applications = { some: { hiringPlanId } };
    }

    // For topN by AI score, we need a special query
    if (topN && hiringPlanId) {
      return this.findTopByAiScore(orgId, hiringPlanId, topN, where);
    }

    // Determine orderBy — if sorting by aiMatchScore, sort via applications
    let orderBy: Prisma.CandidateOrderByWithRelationInput;
    if (sortBy === 'aiMatchScore') {
      // Sort candidates by their best AI score across applications
      orderBy = {
        applications: { _count: sortOrder },
      };
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const effectiveLimit = topN || limit;
    const skip = topN ? 0 : (page - 1) * effectiveLimit;

    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        skip,
        take: effectiveLimit,
        orderBy,
        include: {
          applications: {
            select: {
              id: true,
              hiringPlanId: true,
              status: true,
              aiMatchScore: true,
              aiMatchSummary: true,
              appliedAt: true,
              hiringPlan: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: topN ? 1 : page,
        limit: effectiveLimit,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  /**
   * Get top N candidates for a specific hiring plan, sorted by AI match score desc.
   */
  private async findTopByAiScore(
    orgId: string,
    hiringPlanId: string,
    topN: number,
    baseWhere: Prisma.CandidateWhereInput,
  ) {
    // Query applications directly, then map back to candidates
    const topApps = await this.prisma.candidateApplication.findMany({
      where: {
        hiringPlanId,
        aiMatchScore: { not: null },
        candidate: baseWhere,
      },
      orderBy: { aiMatchScore: 'desc' },
      take: topN,
      include: {
        candidate: true,
        hiringPlan: { select: { id: true, title: true } },
      },
    });

    const data = topApps.map((app) => ({
      ...app.candidate,
      applications: [
        {
          id: app.id,
          hiringPlanId: app.hiringPlanId,
          status: app.status,
          aiMatchScore: app.aiMatchScore,
          aiMatchSummary: app.aiMatchSummary,
          appliedAt: app.appliedAt,
          hiringPlan: app.hiringPlan,
        },
      ],
    }));

    return {
      data,
      meta: { total: data.length, page: 1, limit: topN, totalPages: 1 },
    };
  }

  async findOne(orgId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, orgId },
      include: {
        applications: {
          include: {
            hiringPlan: { select: { id: true, title: true, department: true } },
            currentStage: { select: { id: true, name: true, stageType: true } },
            stageHistory: {
              include: { stage: { select: { name: true, stageType: true } } },
              orderBy: { enteredAt: 'asc' },
            },
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async update(orgId: string, id: string, dto: UpdateCandidateDto) {
    await this.findOne(orgId, id);
    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.experienceYears !== undefined && {
          experienceYears: dto.experienceYears ? new Prisma.Decimal(dto.experienceYears) : null,
        }),
        ...(dto.expectedCtc !== undefined && {
          expectedCtc: dto.expectedCtc ? new Prisma.Decimal(dto.expectedCtc) : null,
        }),
      },
    });
  }
}
