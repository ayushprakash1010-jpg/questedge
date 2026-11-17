import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RankResumesDto, ScoringWeightsDto } from './dto/rank-resumes.dto';
import { RankingResponse } from './interfaces/ranking-result.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResumeRankingService {
  private readonly logger = new Logger(ResumeRankingService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
    this.internalApiKey = this.config.get<string>(
      'INTERNAL_API_KEY',
      'dev-internal-key',
    );
  }

  // ── 1. Rank Resumes ──────────────────────────────────────────────

  async rankResumes(orgId: string, userId: string, dto: RankResumesDto) {
    const startTime = Date.now();

    // 1. Validate mandate belongs to org
    const mandate = await this.prisma.mandate.findFirst({
      where: { id: dto.mandateId, orgId },
    });

    if (!mandate) {
      throw new NotFoundException(
        `Mandate ${dto.mandateId} not found in your organization`,
      );
    }

    // 2. Gather candidate data from both Candidate and CandidateProfile tables
    const candidateData = await this.gatherCandidateData(
      orgId,
      dto.candidateIds,
    );

    if (candidateData.length === 0) {
      throw new BadRequestException(
        'No valid candidates found with resumes. At least one candidate must have a resume uploaded.',
      );
    }

    // 3. Extract resume text for each candidate
    const candidatesWithText = await this.extractResumeTexts(candidateData);

    const candidatesReady = candidatesWithText.filter((c) => c.resumeText);
    if (candidatesReady.length === 0) {
      throw new BadRequestException(
        'Could not extract text from any candidate resumes. Please ensure resumes are valid PDF or DOCX files.',
      );
    }

    // 4. Create ranking session
    const session = await this.prisma.resumeRankingSession.create({
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

    // 5. Build JD payload from mandate
    const jobDescription = this.buildJdPayload(mandate);

    // 6. Build skills list from mandate
    const skills = this.buildSkillsList(mandate);

    // 7. Build AI request payload
    const aiPayload = {
      jobDescription,
      skills,
      candidates: candidatesReady.map((c) => ({
        candidateId: c.id,
        candidateName: c.name,
        resumeText: c.resumeText,
        currentCompany: c.currentCompany || null,
        currentRole: c.currentRole || null,
        experienceYears: c.experienceYears || null,
        education: c.education || null,
      })),
      weights: dto.customWeights || undefined,
    };

    // 8. Call AI service
    let aiResult: RankingResponse;
    try {
      aiResult = await this.callAiRankingService(aiPayload);
    } catch (err: any) {
      // Update session as failed
      await this.prisma.resumeRankingSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
        },
      });
      this.logger.error(`AI ranking service call failed: ${err.message}`);
      throw new InternalServerErrorException(
        'Resume ranking failed. Please try again.',
      );
    }

    // 9. Store results
    const resultRows = (aiResult.rankings || []).map((r) => ({
      sessionId: session.id,
      candidateId: r.candidateId || null,
      candidateName: r.candidateName || 'Unknown',
      rank: r.rank,
      totalScore: new Prisma.Decimal(
        Math.max(0, Math.min(100, r.totalScore || 0)),
      ),
      verdict: r.verdict || 'PARTIAL_FIT',
      scoreBreakdown: r.scoreBreakdown as unknown as Prisma.InputJsonValue,
      strengths: (r.strengths || []) as unknown as Prisma.InputJsonValue,
      gaps: (r.gaps || []) as unknown as Prisma.InputJsonValue,
      standoutFactors: (r.standoutFactors ||
        []) as unknown as Prisma.InputJsonValue,
      comparisonNote: r.comparisonNote || null,
      recommendation: r.recommendation || null,
    }));

    if (resultRows.length > 0) {
      await this.prisma.resumeRankingResult.createMany({
        data: resultRows,
      });
    }

    // 10. Update session as completed
    const processingTimeMs = Date.now() - startTime;
    await this.prisma.resumeRankingSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        processingTimeMs,
        poolSummary: aiResult.summary || null,
      },
    });

    this.logger.log(
      `Ranked ${candidatesReady.length} candidates for mandate ${dto.mandateId} in ${processingTimeMs}ms`,
    );

    // 11. Return full results
    return this.getSessionResults(orgId, session.id);
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

    const [sessions, total] = await Promise.all([
      this.prisma.resumeRankingSession.findMany({
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
      this.prisma.resumeRankingSession.count({ where }),
    ]);

    return {
      data: sessions.map((s) => ({
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
    const session = await this.prisma.resumeRankingSession.findFirst({
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
      rankings: session.results.map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        referralId: r.referralId,
        candidateName: r.candidateName,
        rank: r.rank,
        totalScore: r.totalScore,
        verdict: r.verdict,
        scoreBreakdown: r.scoreBreakdown,
        strengths: r.strengths,
        gaps: r.gaps,
        standoutFactors: r.standoutFactors,
        comparisonNote: r.comparisonNote,
        recommendation: r.recommendation,
      })),
    };
  }

  // ── 4. Re-Rank with Different Weights ────────────────────────────

  async reRank(
    orgId: string,
    userId: string,
    sessionId: string,
    customWeights: ScoringWeightsDto,
  ) {
    const original = await this.prisma.resumeRankingSession.findFirst({
      where: { id: sessionId, orgId },
      include: {
        results: { select: { candidateId: true } },
      },
    });

    if (!original) {
      throw new NotFoundException(
        `Original ranking session ${sessionId} not found`,
      );
    }

    const candidateIds = original.results
      .map((r) => r.candidateId)
      .filter(Boolean) as string[];

    if (candidateIds.length === 0) {
      throw new BadRequestException(
        'No candidates found in the original ranking session',
      );
    }

    return this.rankResumes(orgId, userId, {
      mandateId: original.mandateId,
      candidateIds,
      customWeights,
    });
  }

  // ── Private Helpers ──────────────────────────────────────────────

  private async gatherCandidateData(orgId: string, candidateIds: string[]) {
    // Try both Candidate table and CandidateProfile table
    const [directCandidates, profileCandidates] = await Promise.all([
      this.prisma.candidate.findMany({
        where: {
          id: { in: candidateIds },
          orgId,
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
        },
      }),
    ]);

    // Also check referrals for candidates linked by ID
    const referralCandidates = await this.prisma.referral.findMany({
      where: {
        id: { in: candidateIds },
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
          },
        },
      },
    });

    const candidates: Array<{
      id: string;
      name: string;
      email: string;
      resumeUrl: string | null;
      currentCompany: string | null;
      currentRole: string | null;
      experienceYears: number | null;
      education: string | null;
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
          experienceYears: c.experienceYears
            ? Number(c.experienceYears)
            : null,
          education: null,
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
          experienceYears: c.experienceYears
            ? Number(c.experienceYears)
            : null,
          education: c.education as string | null,
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
          experienceYears: c.experienceYears
            ? Number(c.experienceYears)
            : null,
          education: c.education as string | null,
        });
      }
    }

    // Filter to only those with resumes
    return candidates.filter((c) => c.resumeUrl);
  }

  private async extractResumeTexts(
    candidates: Array<{
      id: string;
      name: string;
      resumeUrl: string | null;
      currentCompany: string | null;
      currentRole: string | null;
      experienceYears: number | null;
      education: string | null;
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
      if (!candidate.resumeUrl) continue;

      try {
        const resumeText = await this.extractSingleResume(
          candidate.resumeUrl,
        );
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
            `Resume text too short for candidate ${candidate.id}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to extract resume for ${candidate.id}: ${err.message}`,
        );
      }
    }

    return results;
  }

  private async extractSingleResume(resumeUrl: string): Promise<string> {
    // Download the resume file
    const fileResponse = await fetch(resumeUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download resume: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    const contentType = resumeUrl.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Send to AI service for text extraction
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([buffer], { type: contentType }),
      resumeUrl.split('/').pop() || 'resume',
    );

    const response = await fetch(
      `${this.aiServiceUrl}/ai/extract-resume-text`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.internalApiKey,
        },
        body: formData,
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`AI text extraction failed: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as { text: string };
    return data.text || '';
  }

  private buildJdPayload(mandate: any): Record<string, any> {
    // Parse mandate description — it may be HTML or plain text
    let descriptionPlain = mandate.description || '';
    // Strip HTML tags if present
    descriptionPlain = descriptionPlain.replace(/<[^>]*>/g, ' ').trim();

    return {
      title: mandate.title,
      summary: descriptionPlain.substring(0, 2000),
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
      const name = typeof skill === 'string' ? skill : skill?.name || skill?.skill;
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
      const name = typeof skill === 'string' ? skill : skill?.name || skill?.skill;
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

  private async callAiRankingService(payload: any): Promise<RankingResponse> {
    this.logger.log(
      `Calling AI ranking service with ${payload.candidates.length} candidates`,
    );

    const response = await fetch(`${this.aiServiceUrl}/ai/rank-resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.internalApiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000), // 3 min timeout for large batches
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `AI ranking service returned ${response.status}: ${errText}`,
      );
    }

    return (await response.json()) as RankingResponse;
  }
}
