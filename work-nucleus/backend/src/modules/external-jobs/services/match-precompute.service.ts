import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NormalizerService } from './normalizer.service';

/**
 * Pre-computes match scores between candidate profiles and external jobs.
 * Uses the same 100-point scoring system as AiMatchingService:
 *   - Skills Fit:      0-40 pts
 *   - Experience Fit:  0-25 pts
 *   - Role/Domain Fit: 0-20 pts
 *   - Preferences Fit: 0-15 pts
 *
 * Runs as a pg-boss scheduled job every 6 hours.
 */
@Injectable()
export class MatchPrecomputeService {
  private readonly logger = new Logger(MatchPrecomputeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: NormalizerService,
  ) {}

  /**
   * Compute matches for ALL active candidates against ALL active external jobs.
   * Stores the top 100 matches per candidate.
   */
  async computeAllMatches(): Promise<{ candidatesProcessed: number; matchesWritten: number }> {
    const candidates = await this.prisma.candidateProfile.findMany({
      where: {
        isProfileComplete: true,
        isActive: true,
      },
      select: {
        id: true,
        skills: true,
        experienceYears: true,
        currentLocation: true,
        preferredLocations: true,
        workModel: true,
        currentCtc: true,
        expectedCtc: true,
        noticePeriodDays: true,
        preferredRoles: true,
        preferredIndustries: true,
        currentDesignation: true,
        headline: true,
      },
    });

    const externalJobs = await this.prisma.externalJob.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        extractedSkills: true,
        experienceLevel: true,
        location: true,
        city: true,
        workplaceType: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        employmentType: true,
        department: true,
        companyName: true,
      },
    });

    this.logger.log(
      `Computing matches: ${candidates.length} candidates × ${externalJobs.length} external jobs`,
    );

    let totalMatchesWritten = 0;

    for (const candidate of candidates) {
      try {
        const matchesWritten = await this.computeMatchesForCandidate(
          candidate,
          externalJobs,
        );
        totalMatchesWritten += matchesWritten;
      } catch (err: any) {
        this.logger.warn(
          `Failed to compute matches for candidate ${candidate.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Match computation complete: ${candidates.length} candidates, ${totalMatchesWritten} matches written`,
    );

    return {
      candidatesProcessed: candidates.length,
      matchesWritten: totalMatchesWritten,
    };
  }

  /**
   * Compute matches for a single candidate against all active external jobs.
   */
  async computeMatchesForCandidate(
    candidate: any,
    externalJobs?: any[],
  ): Promise<number> {
    if (!externalJobs) {
      externalJobs = await this.prisma.externalJob.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          extractedSkills: true,
          experienceLevel: true,
          location: true,
          city: true,
          workplaceType: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          employmentType: true,
          department: true,
          companyName: true,
        },
      });
    }

    const candidateSkills = this.extractArray(candidate.skills);
    const preferredRoles = this.extractArray(candidate.preferredRoles);
    const preferredLocations = this.extractArray(candidate.preferredLocations);
    const candidateExp = candidate.experienceYears
      ? Number(candidate.experienceYears)
      : 0;
    const candidateRole =
      candidate.headline || candidate.currentDesignation || '';
    const candidateWorkModel = (candidate.workModel || '').toLowerCase();
    const candidateExpectedCtc = candidate.expectedCtc
      ? Number(candidate.expectedCtc)
      : 0;

    // Score all jobs
    const scored = externalJobs.map((job) => {
      const jobSkills = this.extractArray(job.extractedSkills);

      const skillsResult = this.evaluateSkillsFit(candidateSkills, jobSkills);
      const experienceScore = this.evaluateExperienceFit(
        candidateExp,
        job.experienceLevel,
      );
      const roleFitScore = this.evaluateRoleFit(
        candidateRole,
        preferredRoles,
        job.title,
        job.department || '',
      );
      const preferencesScore = this.evaluatePreferencesFit(
        candidateWorkModel,
        job.workplaceType,
        candidate.currentLocation,
        preferredLocations,
        job.city || job.location,
        candidateExpectedCtc,
        job.salaryMin ? Number(job.salaryMin) : 0,
        job.salaryMax ? Number(job.salaryMax) : 0,
        candidate.noticePeriodDays,
      );

      const totalScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            skillsResult.score +
              experienceScore +
              roleFitScore +
              preferencesScore,
          ),
        ),
      );

      return {
        externalJobId: job.id,
        totalScore,
        skillsScore: skillsResult.score,
        experienceScore,
        roleFitScore,
        preferencesScore,
        matchedSkills: skillsResult.matched,
        missingSkills: skillsResult.missing,
      };
    });

    // Sort by total score descending, keep top 100
    scored.sort((a, b) => b.totalScore - a.totalScore);
    const topMatches = scored.slice(0, 100);

    // Delete existing matches for this candidate
    await this.prisma.externalJobMatch.deleteMany({
      where: { candidateProfileId: candidate.id },
    });

    // Bulk insert top matches
    if (topMatches.length > 0) {
      await this.prisma.externalJobMatch.createMany({
        data: topMatches.map((m) => ({
          candidateProfileId: candidate.id,
          externalJobId: m.externalJobId,
          totalScore: m.totalScore,
          skillsScore: m.skillsScore,
          experienceScore: m.experienceScore,
          roleFitScore: m.roleFitScore,
          preferencesScore: m.preferencesScore,
          matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills,
        })),
        skipDuplicates: true,
      });
    }

    return topMatches.length;
  }

  // ── Skills Fit (0-40 pts) ──────────────────────────────────────

  private evaluateSkillsFit(
    candidateSkills: string[],
    jobSkills: string[],
  ): { score: number; matched: string[]; missing: string[] } {
    if (jobSkills.length === 0) {
      // No skills listed — give partial score
      return { score: 20, matched: [], missing: [] };
    }

    const normCandidate = candidateSkills.map((s) => this.normalizeSkill(s));
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of jobSkills) {
      const normSkill = this.normalizeSkill(skill);
      const isMatch = normCandidate.some(
        (c) =>
          c === normSkill ||
          c.includes(normSkill) ||
          normSkill.includes(c),
      );
      if (isMatch) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    const ratio = matched.length / jobSkills.length;
    const score = Math.round(ratio * 40);

    return { score: Math.min(40, score), matched, missing };
  }

  // ── Experience Fit (0-25 pts) ──────────────────────────────────

  private evaluateExperienceFit(
    candidateYears: number,
    experienceLevel?: string | null,
  ): number {
    if (!experienceLevel) return 20; // No requirement specified

    const level = experienceLevel.toLowerCase();
    let minExp = 0;
    let maxExp = 99;

    if (level === 'intern' || level === 'internship') {
      minExp = 0;
      maxExp = 1;
    } else if (level === 'fresher' || level === 'entry') {
      minExp = 0;
      maxExp = 2;
    } else if (level === 'junior') {
      minExp = 1;
      maxExp = 3;
    } else if (level === 'mid') {
      minExp = 3;
      maxExp = 7;
    } else if (level === 'senior') {
      minExp = 5;
      maxExp = 15;
    } else if (level === 'lead') {
      minExp = 8;
      maxExp = 20;
    }

    if (candidateYears >= minExp && candidateYears <= maxExp) return 25;
    if (candidateYears >= minExp - 1 && candidateYears <= maxExp + 2) return 18;
    if (candidateYears >= minExp - 2) return 12;
    return 5;
  }

  // ── Role / Domain Fit (0-20 pts) ──────────────────────────────

  private evaluateRoleFit(
    candidateRole: string,
    preferredRoles: string[],
    jobTitle: string,
    jobDepartment: string,
  ): number {
    const jobText = `${jobTitle} ${jobDepartment}`.toLowerCase();
    const jobTokens = jobText.split(/[\s\-_/,]+/).filter((t) => t.length > 2);

    // Check preferred roles first
    for (const role of preferredRoles) {
      const roleTokens = role.toLowerCase().split(/[\s\-_/,]+/);
      const overlap = roleTokens.filter(
        (t) => t.length > 2 && jobTokens.includes(t),
      );
      if (overlap.length >= 1) return 20;
    }

    // Check candidate's current role
    const cTokens = candidateRole
      .toLowerCase()
      .split(/[\s\-_/,]+/)
      .filter((t) => t.length > 2);

    let commonCount = 0;
    for (const token of cTokens) {
      if (jobTokens.includes(token)) commonCount++;
    }

    if (commonCount >= 2) return 20;
    if (commonCount === 1) return 15;
    return 8;
  }

  // ── Preferences Fit (0-15 pts) ────────────────────────────────

  private evaluatePreferencesFit(
    candidateWorkModel: string,
    jobWorkplaceType: string | null,
    candidateLocation: string | null,
    preferredLocations: string[],
    jobLocation: string | null,
    candidateExpectedCtc: number,
    jobSalaryMin: number,
    jobSalaryMax: number,
    noticePeriodDays: number | null,
  ): number {
    let score = 0;

    // Work model fit (max 5 pts)
    const jModel = (jobWorkplaceType || '').toLowerCase();
    if (
      !candidateWorkModel ||
      !jModel ||
      candidateWorkModel === jModel.toLowerCase() ||
      jModel === 'remote' ||
      candidateWorkModel === 'flexible'
    ) {
      score += 5;
    } else if (
      (candidateWorkModel === 'hybrid' && jModel === 'remote') ||
      (candidateWorkModel === 'remote' && jModel === 'hybrid')
    ) {
      score += 3;
    } else {
      score += 1;
    }

    // Location fit (max 5 pts)
    const jobLoc = (jobLocation || '').toLowerCase();
    const candLoc = (candidateLocation || '').toLowerCase();

    if (!jobLoc || jModel === 'remote') {
      score += 5; // Remote or no location = always match
    } else if (candLoc && jobLoc.includes(candLoc.split(',')[0].trim())) {
      score += 5;
    } else if (
      preferredLocations.some((pl) =>
        jobLoc.includes(pl.toLowerCase().trim()),
      )
    ) {
      score += 4;
    } else {
      score += 1;
    }

    // Salary fit (max 3 pts)
    if (candidateExpectedCtc > 0 && jobSalaryMax > 0) {
      if (candidateExpectedCtc <= jobSalaryMax) score += 3;
      else if (candidateExpectedCtc <= jobSalaryMax * 1.2) score += 2;
      else score += 0;
    } else {
      score += 2; // No data = neutral
    }

    // Notice period (max 2 pts)
    const notice = noticePeriodDays ?? 30;
    if (notice <= 30) score += 2;
    else if (notice <= 60) score += 1;

    return Math.min(15, score);
  }

  // ── Utilities ─────────────────────────────────────────────────

  private extractArray(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((s) =>
          typeof s === 'string' ? s : s?.name || s?.skill || String(s),
        )
        .filter(Boolean);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return this.extractArray(parsed);
      } catch {
        return raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  private normalizeSkill(skill: string): string {
    return skill
      .toLowerCase()
      .replace(/\.js\b/g, '')
      .replace(/[.\-_]/g, '')
      .trim();
  }
}

