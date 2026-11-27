import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
      throw new ConflictException(
        'A candidate with this email already exists in your organization',
      );
    }

    return this.prisma.candidate.create({
      data: {
        ...dto,
        orgId,
        experienceYears: dto.experienceYears
          ? new Prisma.Decimal(dto.experienceYears)
          : null,
        expectedCtc: dto.expectedCtc
          ? new Prisma.Decimal(dto.expectedCtc)
          : null,
      },
    });
  }

  async findAll(orgId: string, query: QueryCandidatesDto) {
    if (!orgId) {
      return { data: [], meta: { total: 0, page: 1, limit: query.limit || 20, totalPages: 0 } };
    }

    const {
      page = 1,
      limit = 20,
      q,
      source,
      hiringPlanId,
      mandateId,
      status,
      topN,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const planOrMandateId = mandateId || hiringPlanId;

    const appStatusFilter =
      status === 'PENDING_REVIEW'
        ? 'ACTIVE'
        : status && ['ACTIVE', 'SELECTED', 'REJECTED', 'ON_HOLD', 'WITHDRAWN'].includes(status)
          ? status
          : undefined;

    const where: Prisma.CandidateWhereInput = { orgId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (source) where.source = source;
    if (planOrMandateId || appStatusFilter) {
      where.applications = {
        some: {
          ...(planOrMandateId
            ? {
                OR: [
                  { hiringPlanId: planOrMandateId },
                  { mandateId: planOrMandateId },
                ],
              }
            : {}),
          ...(appStatusFilter ? { status: appStatusFilter as any } : {}),
        },
      };
    }

    // For topN by AI score, we need a special query
    if (topN && planOrMandateId) {
      return this.findTopByAiScore(orgId, planOrMandateId, topN, where);
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

    const [rawPlanCandidates, planTotal] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        orderBy,
        include: {
          applications: {
            select: {
              id: true,
              hiringPlanId: true,
              mandateId: true,
              candidateProfileId: true,
              sourceType: true,
              status: true,
              aiMatchScore: true,
              aiMatchSummary: true,
              appliedAt: true,
              hiringPlan: { select: { id: true, title: true } },
              offer: { select: { id: true, status: true } },
              candidateProfile: {
                select: {
                  id: true,
                  resumeUrl: true,
                  headline: true,
                  skills: true,
                  currentCompany: true,
                  currentDesignation: true,
                  experienceYears: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    // Backfill candidateProfileId & resumeUrl from linked CandidateProfile for direct/recruiter applications
    const planCandidates = rawPlanCandidates.map((c: any) => {
      const appWithProfile = (c.applications || []).find(
        (a: any) =>
          a.candidateProfile &&
          (!planOrMandateId ||
            a.mandateId === planOrMandateId ||
            a.hiringPlanId === planOrMandateId),
      ) || (c.applications || []).find((a: any) => a.candidateProfile);

      const linkedProfile = appWithProfile?.candidateProfile;
      return {
        ...c,
        candidateProfileId:
          c.candidateProfileId || appWithProfile?.candidateProfileId || linkedProfile?.id,
        resumeUrl: c.resumeUrl || linkedProfile?.resumeUrl || null,
        ...(linkedProfile ? { candidateProfile: linkedProfile } : {}),
      };
    });

    // Query mandate referrals if source is all or REFERRAL
    let referralCandidates: any[] = [];
    if (!source || source === 'REFERRAL') {
      const referralWhere: any = { mandate: { orgId } };
      if (planOrMandateId) {
        referralWhere.mandateId = planOrMandateId;
      }
      if (status) {
        if (status === 'PENDING_REVIEW') {
          referralWhere.status = {
            in: ['UNDER_REVIEW', 'SHORTLISTED', 'CANDIDATE_ACCEPTED', 'ACTIVATED', 'PENDING_CONSENT', 'CONSENT_REQUESTED'],
          };
        } else if (status === 'SELECTED') {
          referralWhere.status = { in: ['SELECTED', 'HIRED'] };
        } else if (status === 'REJECTED') {
          referralWhere.status = { in: ['REJECTED', 'CANDIDATE_DECLINED'] };
        } else if (status === 'WITHDRAWN') {
          referralWhere.status = 'WITHDRAWN';
        } else if (status === 'ACTIVE') {
          referralWhere.status = {
            in: ['PENDING_CONSENT', 'CONSENT_REQUESTED', 'CANDIDATE_ACCEPTED', 'ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW'],
          };
        } else if (status === 'ON_HOLD') {
          referralWhere.id = '00000000-0000-0000-0000-000000000000';
        }
      }
      if (q) {
        referralWhere.candidateProfile = {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        };
      }

      const referrals = await this.prisma.referral.findMany({
        where: referralWhere,
        include: {
          candidateProfile: true,
          mandate: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: sortOrder },
      });

      referralCandidates = referrals
        .filter((r) => r.candidateProfile && r.candidateProfile.email)
        .map((r) => ({
          id: r.candidateProfile.id,
          orgId,
          name: r.candidateProfile.name || 'Candidate',
          email: r.candidateProfile.email,
          phone: r.candidateProfile.phone,
          resumeUrl: r.candidateProfile.resumeUrl,
          source: 'REFERRAL',
          currentCompany: r.candidateProfile.currentCompany,
          currentRole: r.candidateProfile.currentDesignation,
          experienceYears: r.candidateProfile.experienceYears
            ? new Prisma.Decimal(r.candidateProfile.experienceYears)
            : null,
          expectedCtc: null,
          noticePeriodDays: null,
          notes: r.recruiterNote,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          applications: [
            {
              id: r.id,
              hiringPlanId: r.mandateId,
              isReferral: true,
              status:
                r.status === 'HIRED' || r.status === 'SELECTED'
                  ? 'SELECTED'
                  : r.status === 'REJECTED' ||
                      r.status === 'CANDIDATE_DECLINED'
                    ? 'REJECTED'
                    : r.status === 'WITHDRAWN'
                      ? 'WITHDRAWN'
                      : 'ACTIVE',
              aiMatchScore: r.aiMatchScore
                ? new Prisma.Decimal(r.aiMatchScore.toString())
                : null,
              aiMatchSummary: r.aiMatchSummary || (r as any).aiSummary || null,
              appliedAt: r.createdAt,
              hiringPlan: { id: r.mandate?.id || r.mandateId, title: r.mandate?.title || 'Job Mandate' },
            },
          ],
        }));
    }

    // Combine and deduplicate by email
    const candidateMap = new Map<string, any>();
    for (const c of planCandidates) {
      if (c && c.email) {
        candidateMap.set(c.email.toLowerCase(), c);
      }
    }
    for (const rc of referralCandidates) {
      if (rc && rc.email) {
        const key = rc.email.toLowerCase();
        if (candidateMap.has(key)) {
          const existing = candidateMap.get(key);
          existing.applications = [
            ...(existing.applications || []),
            ...rc.applications,
          ];
          // If the candidate has referrals, prioritize REFERRAL status
          if (rc.source === 'REFERRAL') {
            existing.source = 'REFERRAL';
          }
          if (!existing.resumeUrl && rc.resumeUrl) {
            existing.resumeUrl = rc.resumeUrl;
          }
          if (!existing.candidateProfileId && rc.id) {
            existing.candidateProfileId = rc.id;
          }
        } else {
          candidateMap.set(key, rc);
        }
      }
    }

    const combined = Array.from(candidateMap.values());
    const total = combined.length;
    const paginated = combined.slice(skip, skip + effectiveLimit);

    return {
      data: paginated,
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
        OR: [{ hiringPlanId }, { mandateId: hiringPlanId }],
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
          experienceYears: dto.experienceYears
            ? new Prisma.Decimal(dto.experienceYears)
            : null,
        }),
        ...(dto.expectedCtc !== undefined && {
          expectedCtc: dto.expectedCtc
            ? new Prisma.Decimal(dto.expectedCtc)
            : null,
        }),
      },
    });
  }
}
