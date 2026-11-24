import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RankResumesDto, ScoringWeightsDto } from './dto/rank-resumes.dto';
import { RankingResponse } from './interfaces/ranking-result.interface';
import { Prisma } from '@prisma/client';
import { EvidenceRankingService } from './evidence-ranking.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { DEFAULT_DIMENSION_WEIGHTS } from './ranking-policy';
import { RankingScorecardStore } from './ranking-scorecard.store';

@Injectable()
export class ResumeRankingService {
  private readonly logger = new Logger(ResumeRankingService.name);
  private readonly modelName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly evidenceRanking: EvidenceRankingService,
    private readonly fileUpload: FileUploadService,
    private readonly scorecards: RankingScorecardStore,
  ) {
    this.modelName =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
  }

  // ── 1. Rank Resumes ──────────────────────────────────────────────

  async rankResumes(orgId: string, userId: string, dto: RankResumesDto) {
    const startTime = Date.now();
    const requestedWeights = this.resolveWeights(dto.customWeights);
    const mandate = await this.findMandate(orgId, dto.mandateId);
    const input = this.scorecardInput(dto, mandate, requestedWeights);
    const { weights } = input;

    // 2. Gather candidate data from Candidate, CandidateProfile, and Referral tables with strict org/mandate tenant scoping
    const candidateData = await this.gatherCandidateData(
      orgId,
      dto.candidateIds,
      mandate.id,
    );

    // Require readable evidence for every selected candidate.
    const candidatesWithText = await this.extractResumeTexts(candidateData);

    const candidatesReady = candidatesWithText.filter((c) => c.resumeText);
    const readable = new Set(candidatesReady.map((candidate) => candidate.id));
    const missing = dto.candidateIds.filter((id) => !readable.has(id));
    if (missing.length) {
      throw new BadRequestException({
        message: `Manual review needed. Provide readable resumes or review the selections for: ${missing.join(', ')}.`,
        manualReviewCandidateIds: missing,
      });
    }
    const confirmedScorecard = await this.scorecards.resolve(
      orgId,
      mandate.id,
      input,
      dto.confirmedScorecardId,
    );

    // 4. Create ranking session
    const session = await (this.prisma as any).resumeRankingSession.create({
      data: {
        orgId,
        mandateId: dto.mandateId,
        createdById: userId,
        candidateCount: candidatesReady.length,
        customWeights: dto.customWeights
          ? (dto.customWeights as unknown as Prisma.InputJsonValue)
          : undefined,
        status: 'PROCESSING',
      },
    });

    const aiPayload = {
      ...input,
      runId: session.id,
      confirmedScorecard,
      candidates: candidatesReady.map((c) => ({
        candidateId: c.id,
        candidateName: c.name,
        resumeText: c.resumeText,
        currentCompany: c.currentCompany || null,
        currentRole: c.currentRole || null,
        experienceYears: c.experienceYears ?? null,
        education: c.education || null,
      })),
    };

    try {
      const aiResult = await this.evaluate(orgId, aiPayload);
      const resultRows = this.sanitizeRankingResults(
        aiResult,
        session.id,
        aiPayload.candidates,
        weights,
        dto.confirmedScorecardId,
      );
      await this.prisma.$transaction(async (tx) => {
        await tx.resumeRankingResult.createMany({
          data: resultRows.map(
            ({ isDisqualified, disqualificationReason, ...row }) => row,
          ),
        });
        await tx.resumeRankingSession.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            processingTimeMs: Date.now() - startTime,
            poolSummary: aiResult.summary || null,
            customWeights: aiResult.evaluation?.weights || weights,
            aiModel: String(
              (resultRows[0]?.scoreBreakdown as any)?._evaluation?.model ||
                this.modelName,
            ),
          },
        });
      });
      return await this.getSessionResults(orgId, session.id);
    } catch (err: any) {
      await this.prisma.resumeRankingSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
        },
      });
      throw err;
    }
  }

  // ── 2. Get Sessions for Mandate ──────────────────────────────────

  async getSessionsForMandate(
    orgId: string,
    mandateId: string,
    page = 1,
    limit = 10,
  ) {
    const where = { orgId, mandateId };
    const skip = (page - 1) * limit;

    const [sessions, total, lastEvaluation] = await Promise.all([
      (this.prisma as any).resumeRankingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { name: true, email: true } },
          results: {
            orderBy: { rank: 'asc' },
            take: 1,
            select: { candidateName: true, totalScore: true },
          },
        },
      }),
      (this.prisma as any).resumeRankingSession.count({ where }),
      this.prisma.resumeRankingResult.findFirst({
        where: { session: { ...where, status: 'COMPLETED' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { scoreBreakdown: true },
      }),
    ]);
    const audit = (lastEvaluation?.scoreBreakdown as any)?._evaluation;
    return {
      lastSettings:
        audit?.scorecardId && audit?.requestedWeights
          ? {
              weights: audit.requestedWeights,
              shortlistingRules: audit.shortlistingRules || {},
            }
          : null,
      data: sessions.map((s: any) => ({
        id: s.id,
        mandateId: s.mandateId,
        status: s.status,
        candidateCount: s.candidateCount,
        customWeights: s.customWeights,
        poolSummary: s.poolSummary,
        processingTimeMs: s.processingTimeMs,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        createdBy: s.createdBy,
        topCandidate: s.results[0]?.candidateName || null,
        topScore: s.results[0]?.totalScore || null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 3. Get Session Results ───────────────────────────────────────

  async getSessionResults(orgId: string, sessionId: string) {
    const session = await (this.prisma as any).resumeRankingSession.findFirst({
      where: { id: sessionId, orgId },
      include: {
        mandate: {
          select: { id: true, title: true, department: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        results: {
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Ranking session ${sessionId} not found`);
    }

    return {
      session: {
        id: session.id,
        mandateId: session.mandateId,
        mandate: session.mandate,
        status: session.status,
        candidateCount: session.candidateCount,
        customWeights: session.customWeights,
        poolSummary: session.poolSummary,
        processingTimeMs: session.processingTimeMs,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        createdBy: session.createdBy,
      },
      rankings: session.results.map((row: any) => this.displayResult(row)),
      evaluation: session.results[0]?.scoreBreakdown?._evaluation || null,
    };
  }

  async getScorecardPool(
    orgId: string,
    mandateId: string,
    scorecardId: string,
  ) {
    await this.findMandate(orgId, mandateId);
    const rows = await this.prisma.resumeRankingResult.findMany({
      where: {
        session: { orgId, mandateId, status: 'COMPLETED' },
        scoreBreakdown: {
          path: ['_evaluation', 'scorecardId'],
          equals: scorecardId,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['candidateId'],
    });
    const rankings = this.orderByFit(
      rows.map((row) => this.displayResult(row)),
    );
    return {
      scorecardId,
      rankings,
      summary: `${rankings.length} candidates assessed with this scorecard.`,
    };
  }

  private displayResult(row: any) {
    return {
      id: row.id,
      candidateId: row.candidateId,
      referralId: row.referralId,
      candidateName: row.candidateName,
      rank: row.rank,
      totalScore: row.totalScore,
      verdict: row.verdict,
      scoreBreakdown: row.scoreBreakdown,
      strengths: row.strengths,
      gaps: row.gaps,
      standoutFactors: row.standoutFactors,
      comparisonNote: row.comparisonNote,
      recommendation: row.recommendation,
      isDisqualified: Boolean(row.scoreBreakdown?.isDisqualified),
      disqualificationReason:
        row.scoreBreakdown?.disqualificationReason || null,
    };
  }

  // ── 4. Re-Rank with Different Weights ────────────────────────────

  async reRank(
    orgId: string,
    userId: string,
    sessionId: string,
    customWeights: ScoringWeightsDto,
    confirmedScorecardId?: string,
  ) {
    const original = await (this.prisma as any).resumeRankingSession.findFirst({
      where: { id: sessionId, orgId },
      include: {
        results: { select: { candidateId: true, scoreBreakdown: true } },
      },
    });

    if (!original) {
      throw new NotFoundException(
        `Original ranking session ${sessionId} not found`,
      );
    }

    const candidateIds = original.results
      .map((r: any) => r.candidateId)
      .filter(Boolean) as string[];

    if (candidateIds.length === 0) {
      throw new BadRequestException(
        'No candidates found in the original ranking session',
      );
    }

    return this.rankResumes(orgId, userId, {
      mandateId: original.mandateId,
      confirmedScorecardId,
      candidateIds,
      customWeights,
      shortlistingRules:
        original.results[0]?.scoreBreakdown?._evaluation?.shortlistingRules,
    });
  }

  // ── 5. Export Session as CSV (Feature 4) ─────────────────────────

  async exportSessionCsv(orgId: string, sessionId: string): Promise<string> {
    const data = await this.getSessionResults(orgId, sessionId);

    const headers = [
      'Rank',
      'Candidate Name',
      'Total Score',
      'Verdict',
      'Skills Match',
      'Experience Relevance',
      'Project Relevance',
      'Education & Certs',
      'Domain Fit',
      'Role Fit',
      'Cultural Signals',
      'Strengths',
      'Gaps',
      'Standout Factors',
      'Recommendation',
    ];

    const rows = data.rankings.map((r: any) => {
      const breakdown = r.scoreBreakdown || {};
      return [
        r.rank,
        this.escapeCsv(r.candidateName),
        r.totalScore,
        r.verdict,
        breakdown.skillsMatch?.score ?? '',
        breakdown.experienceRelevance?.score ?? '',
        breakdown.projectRelevance?.score ?? '',
        breakdown.educationCertifications?.score ?? '',
        breakdown.domainIndustryFit?.score ?? '',
        breakdown.roleSeniorityFit?.score ?? '',
        breakdown.culturalSoftSignals?.score ?? '',
        this.escapeCsv((r.strengths || []).join('; ')),
        this.escapeCsv((r.gaps || []).join('; ')),
        this.escapeCsv((r.standoutFactors || []).join('; ')),
        this.escapeCsv(r.recommendation || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // ── 6. Compare Candidates Side-by-Side (Feature 3) ──────────────

  async compareCandidates(
    orgId: string,
    sessionId: string,
    candidateIds: string[],
  ) {
    if (candidateIds.length < 2 || candidateIds.length > 4) {
      throw new BadRequestException('Select 2-4 candidates to compare');
    }

    const data = await this.getSessionResults(orgId, sessionId);

    const selected = data.rankings.filter(
      (r: any) =>
        candidateIds.includes(r.candidateId) || candidateIds.includes(r.id),
    );

    if (selected.length < 2) {
      throw new BadRequestException(
        'At least 2 of the selected candidates must have ranking results',
      );
    }

    // Build comparison matrix
    const dimensions = [
      'skillsMatch',
      'experienceRelevance',
      'projectRelevance',
      'educationCertifications',
      'domainIndustryFit',
      'roleSeniorityFit',
      'culturalSoftSignals',
    ];

    const comparisonData = selected.map((r: any) => ({
      candidateId: r.candidateId,
      candidateName: r.candidateName,
      rank: r.rank,
      totalScore: r.totalScore,
      verdict: r.verdict,
      scores: dimensions.map((dim) => ({
        dimension: dim,
        score: r.scoreBreakdown?.[dim]?.score ?? 0,
        maxScore: r.scoreBreakdown?.[dim]?.maxScore ?? 0,
        comment: r.scoreBreakdown?.[dim]?.comment ?? '',
      })),
      strengths: r.strengths || [],
      gaps: r.gaps || [],
      recommendation: r.recommendation || '',
    }));

    // Find who leads in each dimension
    const dimensionLeaders = dimensions.map((dim) => {
      const scores = comparisonData.map((c: any) => ({
        name: c.candidateName,
        score: c.scores.find((s: any) => s.dimension === dim)?.score ?? 0,
      }));
      scores.sort((a: any, b: any) => b.score - a.score);
      return { dimension: dim, leader: scores[0].name, score: scores[0].score };
    });

    return {
      session: data.session,
      candidates: comparisonData,
      dimensionLeaders,
    };
  }

  // ── Quick Rank: Ad-hoc ranking without mandate ──────────────────

  async draftScorecard(orgId: string, dto: any) {
    const mandate = dto.mandateId
      ? await this.findMandate(orgId, dto.mandateId)
      : null;
    return this.scorecards.draft(
      orgId,
      mandate?.id ?? null,
      this.scorecardInput(dto, mandate),
    );
  }

  private async findMandate(orgId: string, id: string) {
    const mandate = await this.prisma.mandate.findFirst({
      where: { id, orgId },
    });
    if (!mandate)
      throw new NotFoundException(
        `Mandate ${id} not found in your organization`,
      );
    return mandate;
  }

  private scorecardInput(
    dto: any,
    mandate?: any,
    weights = this.resolveWeights(dto.customWeights),
  ) {
    if (!mandate && (!dto.jdText || dto.jdText.trim().length < 20)) {
      throw new BadRequestException(
        'Job description text must be at least 20 characters.',
      );
    }
    const quickSkills = (names: string[] | undefined, priority: string) =>
      (names || [])
        .filter((name) => name.trim())
        .map((name) => ({ name: name.trim(), priority }));
    return {
      jobDescription: mandate
        ? this.buildJdPayload(mandate)
        : {
            title: dto.jobTitle || 'Job Position',
            department: dto.department || null,
            location: dto.location || null,
            workModel: dto.workModel || null,
            requiredExperience: dto.requiredExperience || null,
            educationRequirement: dto.educationRequirement || null,
            employmentType: dto.employmentType || null,
            summary: dto.jdText.trim(),
          },
      skills: mandate
        ? this.buildSkillsList(mandate)
        : [
            ...quickSkills(dto.mandatorySkills, 'MANDATORY'),
            ...quickSkills(dto.preferredSkills, 'PREFERRED'),
          ],
      weights,
      shortlistingRules: dto.shortlistingRules
        ? Object.fromEntries(
            Object.entries(
              dto.shortlistingRules as Record<string, string>,
            ).filter(([, value]) => value === 'REQUIRED'),
          )
        : {},
    };
  }

  async quickRank(orgId: string, dto: any) {
    const startTime = Date.now();
    const input = this.scorecardInput(dto);
    const { weights } = input;

    if (!dto.resumes || dto.resumes.length === 0) {
      throw new BadRequestException('At least one resume is required.');
    }

    // Build candidates from provided resume texts, preserving client-side candidateId
    const candidates = dto.resumes.map((r: any, i: number) => ({
      candidateId: r.candidateId || `quick-${i + 1}`,
      candidateName: r.candidateName || `Candidate ${i + 1}`,
      resumeText: r.resumeText,
      currentCompany: r.currentCompany || null,
      currentRole: r.currentRole || null,
      experienceYears:
        r.experienceYears !== undefined &&
        r.experienceYears !== null &&
        !isNaN(Number(r.experienceYears))
          ? Number(r.experienceYears)
          : null,
      education: Array.isArray(r.education)
        ? r.education.join(', ')
        : r.education || null,
      skills: Array.isArray(r.skills) ? r.skills : [],
    }));

    const validCandidates = candidates.filter(
      (c: any) => c.resumeText && c.resumeText.trim().length > 30,
    );

    if (validCandidates.length !== candidates.length) {
      throw new BadRequestException(
        'Manual review needed. Provide readable resume text for every selected candidate.',
      );
    }
    if (
      new Set(validCandidates.map((c: any) => c.candidateId)).size !==
      validCandidates.length
    ) {
      throw new BadRequestException(
        'Each resume must have a unique candidate ID.',
      );
    }

    const confirmedScorecard = await this.scorecards.resolve(
      orgId,
      null,
      input,
      dto.confirmedScorecardId,
    );
    const payload = {
      ...input,
      runId: dto.clientRunId,
      candidates: validCandidates,
      confirmedScorecard,
    };
    const aiResult = await this.evaluate(orgId, payload);

    // Sanitize results (use a temp sessionId)
    const tempSessionId = `quick-${Date.now()}`;
    const sanitized = this.sanitizeRankingResults(
      aiResult,
      tempSessionId,
      payload.candidates,
      weights,
      dto.confirmedScorecardId,
    );

    const processingTimeMs = Date.now() - startTime;

    const mappedRankings = sanitized.map((r: any) => {
      const orig = validCandidates.find(
        (c: any) => c.candidateId === r.candidateId,
      );
      return {
        ...r,
        totalScore: Number(r.totalScore) || 0,
        currentRole: orig?.currentRole || null,
        currentCompany: orig?.currentCompany || null,
        experienceYears:
          orig?.experienceYears !== undefined && orig?.experienceYears !== null
            ? orig.experienceYears
            : null,
        education: orig?.education || null,
        skills: Array.isArray(orig?.skills) ? orig.skills : [],
      };
    });

    return {
      rankings: mappedRankings,
      candidates: mappedRankings,
      summary: aiResult.summary || null,
      jdCoverage: aiResult.jdCoverage || null,
      processingTimeMs,
      candidateCount: validCandidates.length,
      jobTitle: dto.jobTitle || 'Job Position',
      isQuickRank: true,
      evaluation: aiResult.evaluation,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────

  private async gatherCandidateData(
    orgId: string,
    candidateIds: string[],
    mandateId?: string,
  ) {
    // Try Candidate, CandidateProfile, and Referral tables with strict org/mandate tenant scoping
    const [directCandidates, profileCandidates, referralCandidates] =
      await Promise.all([
        this.prisma.candidate.findMany({
          where: {
            id: { in: candidateIds },
            orgId,
            ...(mandateId
              ? {
                  applications: {
                    some: {
                      OR: [{ mandateId }, { hiringPlanId: mandateId }],
                    },
                  },
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            resumeUrl: true,
            currentCompany: true,
            currentRole: true,
            experienceYears: true,
            notes: true,
          },
        }),
        this.prisma.candidateProfile.findMany({
          where: {
            id: { in: candidateIds },
            OR: [
              {
                applications: {
                  some: mandateId
                    ? { OR: [{ mandateId }, { hiringPlanId: mandateId }] }
                    : { hiringPlan: { orgId } },
                },
              },
              {
                referrals: {
                  some: mandateId
                    ? { mandate: { id: mandateId, orgId } }
                    : { mandate: { orgId } },
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            resumeUrl: true,
            currentCompany: true,
            currentDesignation: true,
            experienceYears: true,
            education: true,
            skills: true,
            headline: true,
            certifications: true,
            projects: true,
            currentLocation: true,
            noticePeriodDays: true,
            workModel: true,
          },
        }),
        this.prisma.referral.findMany({
          where: {
            id: { in: candidateIds },
            mandate: mandateId ? { id: mandateId, orgId } : { orgId },
          },
          include: {
            candidateProfile: {
              select: {
                id: true,
                name: true,
                email: true,
                resumeUrl: true,
                currentCompany: true,
                currentDesignation: true,
                experienceYears: true,
                education: true,
                skills: true,
                headline: true,
                certifications: true,
                projects: true,
                currentLocation: true,
                noticePeriodDays: true,
                workModel: true,
              },
            },
          },
        }),
      ]);

    const candidates: Array<{
      id: string;
      name: string;
      email: string;
      resumeUrl: string | null;
      currentCompany: string | null;
      currentRole: string | null;
      experienceYears: number | null;
      education: string | null;
      profileText: string | null; // Fallback text built from profile fields
    }> = [];

    const seenIds = new Set<string>();

    for (const c of directCandidates) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        candidates.push({
          id: c.id,
          name: c.name,
          email: c.email,
          resumeUrl: c.resumeUrl,
          currentCompany: c.currentCompany,
          currentRole: c.currentRole,
          experienceYears:
            c.experienceYears != null ? Number(c.experienceYears) : null,
          education: null,
          profileText: null,
        });
      }
    }

    for (const c of profileCandidates) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        candidates.push({
          id: c.id,
          name: c.name || 'Candidate',
          email: c.email || '',
          resumeUrl: c.resumeUrl,
          currentCompany: c.currentCompany,
          currentRole: c.currentDesignation,
          experienceYears:
            c.experienceYears != null ? Number(c.experienceYears) : null,
          education: c.education as string | null,
          profileText: this.buildProfileText(c),
        });
      }
    }

    for (const ref of referralCandidates) {
      const c = ref.candidateProfile;
      if (c && !seenIds.has(ref.id)) {
        seenIds.add(ref.id);
        candidates.push({
          id: ref.id,
          name: c.name || 'Candidate',
          email: c.email || '',
          resumeUrl: c.resumeUrl,
          currentCompany: c.currentCompany,
          currentRole: c.currentDesignation,
          experienceYears:
            c.experienceYears != null ? Number(c.experienceYears) : null,
          education: c.education as string | null,
          profileText: this.buildProfileText(c),
        });
      }
    }

    // Include candidates with either resume URL or profile data
    const usable = candidates.filter((c) => c.resumeUrl || c.profileText);
    const unusable = candidates.filter((c) => !c.resumeUrl && !c.profileText);
    if (unusable.length > 0) {
      this.logger.warn(
        `${unusable.length} candidate(s) skipped (no resume and no profile data): ${unusable.map((c) => c.id).join(', ')}`,
      );
    }
    return usable;
  }

  // ── Feature 1: Resume Text Caching ────────────────────────────────

  private async extractResumeTexts(
    candidates: Array<{
      id: string;
      name: string;
      resumeUrl: string | null;
      currentCompany: string | null;
      currentRole: string | null;
      experienceYears: number | null;
      education: string | null;
      profileText?: string | null;
    }>,
  ): Promise<
    Array<{
      id: string;
      name: string;
      resumeText: string;
      currentCompany: string | null;
      currentRole: string | null;
      experienceYears: number | null;
      education: string | null;
    }>
  > {
    const results: Array<{
      id: string;
      name: string;
      resumeText: string;
      currentCompany: string | null;
      currentRole: string | null;
      experienceYears: number | null;
      education: string | null;
    }> = [];

    for (const candidate of candidates) {
      try {
        let resumeText: string | null = null;

        // Try to extract from resume URL first
        if (candidate.resumeUrl) {
          try {
            resumeText = await this.extractSingleResume(candidate.resumeUrl);
          } catch (err: any) {
            this.logger.warn(
              `Manual review needed for uploaded resume: ${candidate.id}.`,
            );
            continue;
          }
          if (!resumeText || resumeText.trim().length <= 50) continue;
        }

        // Fallback: use profile-based text if no resume URL or extraction failed
        if (
          resumeText &&
          resumeText.trim().length > 50 &&
          candidate.profileText
        ) {
          resumeText += `\nCANDIDATE PROFILE STATEMENTS (self-reported, may differ from the resume):\n${candidate.profileText}`;
        }
        if (
          (!resumeText || resumeText.trim().length <= 50) &&
          candidate.profileText
        ) {
          this.logger.log(`Using profile data for candidate ${candidate.id}.`);
          resumeText = candidate.profileText;
        }

        if (resumeText && resumeText.trim().length > 50) {
          results.push({
            id: candidate.id,
            name: candidate.name,
            resumeText,
            currentCompany: candidate.currentCompany,
            currentRole: candidate.currentRole,
            experienceYears: candidate.experienceYears,
            education: candidate.education,
          });
        } else {
          this.logger.warn(
            `No usable resume data for candidate ${candidate.id}`,
          );
        }
      } catch (err: any) {
        // Feature 5: Better error logging with candidate context
        this.logger.warn(
          `Could not process resume for candidate ${candidate.id}`,
        );
      }
    }

    return results;
  }

  /**
   * Build a synthetic resume-like text from a candidate's profile fields.
   * Used as a fallback when no uploaded resume file (PDF/DOCX) is available.
   */
  private buildProfileText(profile: {
    name?: string | null;
    headline?: string | null;
    currentCompany?: string | null;
    currentDesignation?: string | null;
    experienceYears?: any;
    skills?: any;
    education?: any;
    certifications?: any;
    projects?: any;
    currentLocation?: string | null;
    noticePeriodDays?: number | null;
    workModel?: string | null;
  }): string | null {
    const parts: string[] = [];

    if (profile.name) parts.push(profile.name.toUpperCase());
    if (profile.headline) parts.push(profile.headline);
    if (profile.currentLocation)
      parts.push(`Location: ${profile.currentLocation}`);
    if (profile.workModel) parts.push(`Work Model: ${profile.workModel}`);

    parts.push('');

    if (profile.currentCompany || profile.currentDesignation) {
      parts.push('CURRENT POSITION');
      if (profile.currentDesignation && profile.currentCompany) {
        parts.push(
          `${profile.currentDesignation} at ${profile.currentCompany}`,
        );
      } else if (profile.currentCompany) {
        parts.push(`Company: ${profile.currentCompany}`);
      } else if (profile.currentDesignation) {
        parts.push(`Role: ${profile.currentDesignation}`);
      }
      if (profile.experienceYears != null) {
        parts.push(`Total Experience: ${profile.experienceYears} years`);
      }
      parts.push('');
    }

    // Skills
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    if (skills.length > 0) {
      parts.push('TECHNICAL SKILLS');
      parts.push(skills.join(', '));
      parts.push('');
    }

    // Education
    const education = Array.isArray(profile.education) ? profile.education : [];
    if (education.length > 0) {
      parts.push('EDUCATION');
      for (const edu of education) {
        if (typeof edu === 'string') {
          parts.push(edu);
        } else if (edu && typeof edu === 'object') {
          const line = [edu.degree, edu.university, edu.year]
            .filter(Boolean)
            .join(' - ');
          if (line) parts.push(line);
        }
      }
      parts.push('');
    }

    // Certifications
    const certs = Array.isArray(profile.certifications)
      ? profile.certifications
      : [];
    if (certs.length > 0) {
      parts.push('CERTIFICATIONS');
      for (const cert of certs) {
        parts.push(
          typeof cert === 'string' ? `- ${cert}` : `- ${JSON.stringify(cert)}`,
        );
      }
      parts.push('');
    }

    // Projects
    const projects = Array.isArray(profile.projects) ? profile.projects : [];
    if (projects.length > 0) {
      parts.push('PROJECTS');
      for (const proj of projects) {
        if (typeof proj === 'string') {
          parts.push(`- ${proj}`);
        } else if (proj && typeof proj === 'object') {
          parts.push(`- ${proj.name || proj.title || JSON.stringify(proj)}`);
          if (proj.description) parts.push(`  ${proj.description}`);
          if (Array.isArray(proj.technologies) && proj.technologies.length) {
            parts.push(
              `  Project technologies: ${proj.technologies.join(', ')}`,
            );
          }
        }
      }
      parts.push('');
    }

    if (profile.noticePeriodDays != null) {
      parts.push(`Notice Period: ${profile.noticePeriodDays} days`);
    }

    const text = parts.join('\n').trim();
    // Only return if we have meaningful content (more than just the name)
    return text.length > 80 ? text : null;
  }

  private async extractSingleResume(resumeUrl: string): Promise<string> {
    // New uploads store an S3 key. Resolve it through the storage service first.
    if (
      resumeUrl &&
      !resumeUrl.startsWith('http') &&
      !resumeUrl.startsWith('/')
    ) {
      resumeUrl = await this.fileUpload.getPresignedUrl(resumeUrl);
    }
    // Feature 5: Validate URL before downloading
    if (
      !resumeUrl ||
      (!resumeUrl.startsWith('http') && !resumeUrl.startsWith('/'))
    ) {
      throw new Error(`Invalid resume URL: ${resumeUrl}`);
    }

    // Download the resume file with timeout
    let fileResponse: Response;
    try {
      fileResponse = await fetch(resumeUrl, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err: any) {
      throw new Error(`Failed to download resume: ${err.message}`);
    }

    if (!fileResponse.ok) {
      throw new Error(`Failed to download resume: HTTP ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Feature 5: Check file size — skip if too large (>10MB) or too small
    if (buffer.length < 4) {
      throw new Error('Resume file is too small or empty');
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Resume file exceeds 10MB limit');
    }

    const pathname = new URL(resumeUrl).pathname.toLowerCase();
    if (
      pathname.endsWith('.txt') ||
      fileResponse.headers?.get('content-type')?.startsWith('text/plain')
    ) {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    }

    const isPdf = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const isDocx = buffer.readUInt32BE(0) === 0x504b0304;
    if (!isPdf && !isDocx) {
      throw new Error('A readable PDF, DOCX, or text file is required.');
    }
    const contentType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const document = new FormData();
    document.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: contentType }),
      isPdf ? 'resume.pdf' : 'resume.docx',
    );
    const parserUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
    const response = await fetch(
      `${parserUrl.replace(/\/$/, '')}/ai/extract-resume-text`,
      {
        method: 'POST',
        headers: {
          'X-Internal-API-Key': this.config.get<string>(
            'INTERNAL_API_KEY',
            process.env.NODE_ENV === 'production' ? '' : 'dev-internal-key',
          ),
        },
        body: document,
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) throw new Error('Document text extraction failed.');
    const { text } = await response.json();
    if (typeof text !== 'string' || text.trim().length < 20) {
      throw new Error('A readable document with selectable text is required.');
    }
    return text;
  }

  private buildJdPayload(mandate: any): Record<string, any> {
    // Parse mandate description — it may be HTML or plain text
    let descriptionPlain = mandate.description || '';
    // Strip HTML tags if present
    descriptionPlain = descriptionPlain.replace(/<[^>]*>/g, ' ').trim();

    return {
      title: mandate.title,
      summary: descriptionPlain,
      educationRequirement: mandate.educationRequirement || '',
      employmentType: mandate.employmentType || '',
      responsibilities: [],
      qualifications: {
        required: mandate.educationRequirement
          ? [mandate.educationRequirement]
          : [],
        preferred: [],
      },
      department: mandate.department || '',
      location: mandate.location || '',
      workModel: mandate.workModel || '',
      requiredExperience: mandate.requiredExperience || '',
      compensationMin: mandate.compensationMin
        ? Number(mandate.compensationMin)
        : null,
      compensationMax: mandate.compensationMax
        ? Number(mandate.compensationMax)
        : null,
    };
  }

  private buildSkillsList(
    mandate: any,
  ): Array<{ name: string; category: string; priority: string }> {
    const skills: Array<{
      name: string;
      category: string;
      priority: string;
    }> = [];

    // Parse mandatory skills
    const mandatorySkills = this.parseJsonField(mandate.mandatorySkills);
    for (const skill of mandatorySkills) {
      const name =
        typeof skill === 'string' ? skill : skill?.name || skill?.skill;
      if (name) {
        skills.push({
          name,
          category: 'TECHNICAL',
          priority: 'MUST_HAVE',
        });
      }
    }

    // Parse preferred skills
    const preferredSkills = this.parseJsonField(mandate.preferredSkills);
    for (const skill of preferredSkills) {
      const name =
        typeof skill === 'string' ? skill : skill?.name || skill?.skill;
      if (name) {
        skills.push({
          name,
          category: 'TECHNICAL',
          priority: 'NICE_TO_HAVE',
        });
      }
    }

    return skills;
  }

  private parseJsonField(field: any): any[] {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return field
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  // ── Feature 5: Result Sanitization ───────────────────────────────

  private resolveWeights(
    customWeights?: ScoringWeightsDto,
  ): Record<string, number> {
    if (!customWeights) return { ...DEFAULT_DIMENSION_WEIGHTS };

    const dimensions = Object.keys(DEFAULT_DIMENSION_WEIGHTS);
    const supplied = Object.keys(customWeights);
    const values = customWeights as Record<string, number>;
    if (
      supplied.length !== dimensions.length ||
      supplied.some((dimension) => !dimensions.includes(dimension)) ||
      dimensions.some((dimension) => {
        const value = values[dimension];
        return !Number.isInteger(value) || value < 0 || value > 50;
      }) ||
      dimensions.reduce((sum, dimension) => sum + values[dimension], 0) !== 100
    ) {
      throw new BadRequestException(
        'Custom scoring weights must include the supported fields, each from 0 to 50, and total 100.',
      );
    }

    return Object.fromEntries(
      dimensions.map((dimension) => [dimension, values[dimension]]),
    );
  }

  private sanitizeRankingResults(
    aiResult: RankingResponse,
    sessionId: string,
    expectedCandidates: Array<{ candidateId: string; candidateName: string }>,
    customWeights?: Record<string, number>,
    scorecardId?: string,
  ) {
    this.assertCandidateIdentity(aiResult, expectedCandidates);
    const expectedNames = new Map(
      expectedCandidates.map((candidate) => [
        candidate.candidateId,
        candidate.candidateName,
      ]),
    );
    const rawList = aiResult.rankings || [];
    const configuredMaxima: Record<string, number> = {
      ...DEFAULT_DIMENSION_WEIGHTS,
      ...(customWeights || {}),
      ...(aiResult.evaluation?.weights || {}),
    };

    const mapped = rawList.map((r: any) => {
      // Validate and clamp each dimension against its maxScore
      let dimensionSum = 0;
      const sanitizedBreakdown: Record<string, any> = {};

      const dimensions = Object.keys(DEFAULT_DIMENSION_WEIGHTS);

      for (const dimKey of dimensions) {
        const maxScore = dimKey === 'logisticsAvailability' ? 0 : configuredMaxima[dimKey];
        const rawDim = r.scoreBreakdown?.[dimKey];

        let score = 0;
        let evidence: string[] = [];
        let comment = '';

        if (
          rawDim &&
          typeof rawDim === 'object' &&
          rawDim.score !== undefined
        ) {
          const num = Number(rawDim.score);
          if (Number.isFinite(num) && num >= 0) {
            score = Math.max(
              0,
              Math.min(maxScore, Math.round(num * 100) / 100),
            );
            dimensionSum += score;
          }
          if (Array.isArray(rawDim.evidence)) {
            evidence = rawDim.evidence
              .filter((e: any) => typeof e === 'string')
              .slice(0, 5);
          }
          if (typeof rawDim.comment === 'string') {
            comment = rawDim.comment.substring(0, 500);
          }
        }

        sanitizedBreakdown[dimKey] = {
          score,
          maxScore,
          evidence,
          comment,
          ...(aiResult.evaluation ? { criteria: rawDim?.criteria || [] } : {}),
        };
      }

      // The AI can explain scores, but cannot set score limits or override their sum.
      const totalScore = Math.max(
        0,
        Math.min(100, Math.round(dimensionSum * 100) / 100),
      );

      // Derive verdict consistently with calibrated thresholds:
      // EXCELLENT_FIT (85+), STRONG_FIT (70-84), PARTIAL_FIT (55-69), WEAK_FIT (<55)
      const verdict =
        totalScore >= 85
          ? 'EXCELLENT_FIT'
          : totalScore >= 70
            ? 'STRONG_FIT'
            : totalScore >= 55
              ? 'PARTIAL_FIT'
              : 'WEAK_FIT';

      const isDisqualified = Boolean(r.isDisqualified);
      const disqualificationReason =
        typeof r.disqualificationReason === 'string' &&
        r.disqualificationReason.trim()
          ? r.disqualificationReason.trim().substring(0, 500)
          : null;

      // Persist knockout flags in breakdown JSON for auditability
      sanitizedBreakdown.isDisqualified = isDisqualified;
      sanitizedBreakdown.disqualificationReason = disqualificationReason;
      if (aiResult.evaluation) {
        sanitizedBreakdown.eligibility = r.scoreBreakdown.eligibility;
        sanitizedBreakdown._evaluation = {
          ...r.scoreBreakdown._evaluation,
          ...(scorecardId
            ? { scorecardId, requestedWeights: customWeights }
            : {}),
        };
      }

      // Sanitize arrays
      const sanitizeArray = (arr: any): string[] => {
        if (!Array.isArray(arr)) return [];
        return arr.filter((item: any) => typeof item === 'string').slice(0, 10);
      };

      return {
        sessionId,
        candidateId: r.candidateId || null,
        candidateName: expectedNames.get(r.candidateId) || 'Unknown',
        totalScoreNumber: totalScore,
        totalScore: new Prisma.Decimal(totalScore),
        verdict: isDisqualified ? 'DISQUALIFIED' : verdict,
        isDisqualified,
        disqualificationReason,
        scoreBreakdown: sanitizedBreakdown as unknown as Prisma.InputJsonValue,
        strengths: sanitizeArray(
          r.strengths,
        ) as unknown as Prisma.InputJsonValue,
        gaps: sanitizeArray(r.gaps) as unknown as Prisma.InputJsonValue,
        standoutFactors: sanitizeArray(
          r.standoutFactors,
        ) as unknown as Prisma.InputJsonValue,
        comparisonNote:
          typeof r.comparisonNote === 'string'
            ? r.comparisonNote.substring(0, 1000)
            : null,
        recommendation:
          typeof r.recommendation === 'string'
            ? r.recommendation.substring(0, 1000)
            : null,
      };
    });

    return this.orderByFit(mapped).map(({ totalScoreNumber, ...row }) => row);
  }

  private orderByFit<
    T extends {
      scoreBreakdown: unknown;
      totalScore: unknown;
      isDisqualified: boolean;
      candidateId: string | null;
    },
  >(rows: T[]) {
    const priority = (row: T) =>
      row.isDisqualified
        ? 2
        : (row.scoreBreakdown as { eligibility?: string })?.eligibility ===
            'NEEDS_VERIFICATION'
          ? 1
          : 0;
    rows.sort(
      (a, b) =>
        priority(a) - priority(b) ||
        Number(b.totalScore) - Number(a.totalScore) ||
        String(a.candidateId).localeCompare(String(b.candidateId)),
    );
    let rank = 0;
    return rows.map((row, index) => {
      const prev = rows[index - 1];
      if (
        !prev ||
        priority(prev) !== priority(row) ||
        Number(prev.totalScore) !== Number(row.totalScore)
      )
        rank = index + 1;
      return { ...row, rank };
    });
  }

  private assertCandidateIdentity(
    aiResult: RankingResponse,
    expectedCandidates: Array<{ candidateId: string }>,
  ): void {
    const expectedIds = expectedCandidates.map(
      (candidate) => candidate.candidateId,
    );
    const actualIds =
      aiResult.rankings?.map((candidate) => candidate.candidateId) || [];
    const expectedSet = new Set(expectedIds);
    const actualSet = new Set(actualIds);
    if (
      expectedSet.size !== expectedIds.length ||
      actualIds.length !== expectedIds.length ||
      actualSet.size !== actualIds.length ||
      actualIds.some((id) => !expectedSet.has(id))
    ) {
      throw new ServiceUnavailableException(
        'AI returned rankings that do not match the submitted resumes. Please retry.',
      );
    }
  }

  // ── CSV Helper ────────────────────────────────────────────────────

  private escapeCsv(value: string): string {
    if (!value) return '""';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ── Gemini Ranking Call ────────────────────────────────────────────

  private async evaluate(
    orgId: string,
    payload: any,
  ): Promise<RankingResponse> {
    return (await this.evidenceRanking.rank(
      orgId,
      payload,
      this.modelName,
    )) as unknown as RankingResponse;
  }
}
