import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssessmentDto, UpdateAssessmentDto, SendAssessmentInviteDto } from './dto';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class AssessmentEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD: Assessments ─────────────────────────────────────────

  async create(dto: CreateAssessmentDto, orgId: string) {
    // Validate mandate belongs to org if provided
    if (dto.mandateId) {
      const mandate = await this.prisma.mandate.findFirst({
        where: { id: dto.mandateId, orgId },
      });
      if (!mandate) throw new NotFoundException('Mandate not found');
    }

    return this.prisma.hiringAssessment.create({
      data: {
        orgId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        durationMinutes: dto.durationMinutes,
        totalPoints: dto.totalPoints ?? 100,
        passingPercentage: dto.passingPercentage ?? 60,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleOptions: dto.shuffleOptions ?? false,
        showResults: dto.showResults ?? true,
        instructions: dto.instructions,
        mandateId: dto.mandateId,
        pipelineStageId: dto.pipelineStageId,
      },
      include: {
        mandate: { select: { id: true, title: true } },
        pipelineStage: { select: { id: true, name: true } },
        _count: { select: { questions: true, codingChallenges: true, attempts: true } },
      },
    });
  }

  async findAll(orgId: string, filters?: { type?: string; mandateId?: string }) {
    if (!orgId) return [];
    return this.prisma.hiringAssessment.findMany({
      where: {
        orgId,
        ...(filters?.type ? { type: filters.type as any } : {}),
        ...(filters?.mandateId ? { mandateId: filters.mandateId } : {}),
      },
      include: {
        mandate: { select: { id: true, title: true } },
        pipelineStage: { select: { id: true, name: true } },
        _count: { select: { questions: true, codingChallenges: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const assessment = await this.prisma.hiringAssessment.findFirst({
      where: { id, orgId },
      include: {
        mandate: { select: { id: true, title: true } },
        pipelineStage: { select: { id: true, name: true } },
        questions: { orderBy: { orderIndex: 'asc' } },
        codingChallenges: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { attempts: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async update(id: string, dto: UpdateAssessmentDto, orgId: string) {
    await this.verifyAssessmentOwnership(id, orgId);

    return this.prisma.hiringAssessment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.totalPoints !== undefined && { totalPoints: dto.totalPoints }),
        ...(dto.passingPercentage !== undefined && { passingPercentage: dto.passingPercentage }),
        ...(dto.shuffleQuestions !== undefined && { shuffleQuestions: dto.shuffleQuestions }),
        ...(dto.shuffleOptions !== undefined && { shuffleOptions: dto.shuffleOptions }),
        ...(dto.showResults !== undefined && { showResults: dto.showResults }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.mandateId !== undefined && { mandateId: dto.mandateId }),
        ...(dto.pipelineStageId !== undefined && { pipelineStageId: dto.pipelineStageId }),
      },
      include: {
        mandate: { select: { id: true, title: true } },
        pipelineStage: { select: { id: true, name: true } },
        _count: { select: { questions: true, codingChallenges: true, attempts: true } },
      },
    });
  }

  async remove(id: string, orgId: string) {
    await this.verifyAssessmentOwnership(id, orgId);

    // Check for active attempts
    const activeAttempts = await this.prisma.assessmentAttempt.count({
      where: { assessmentId: id, status: 'IN_PROGRESS' },
    });
    if (activeAttempts > 0) {
      throw new BadRequestException('Cannot delete assessment with active attempts');
    }

    await this.prisma.hiringAssessment.delete({ where: { id } });
  }

  // ── Invite / Token Generation ─────────────────────────────────

  async sendInvite(assessmentId: string, dto: SendAssessmentInviteDto, orgId: string) {
    await this.verifyAssessmentOwnership(assessmentId, orgId);

    let candidateId = dto.candidateId;

    if (!candidateId && dto.candidateEmail) {
      const email = dto.candidateEmail.trim().toLowerCase();
      let candidate = await this.prisma.candidateProfile.findFirst({
        where: { email },
      });
      if (!candidate) {
        candidate = await this.prisma.candidateProfile.create({
          data: {
            auth0Sub: `guest_${randomUUID()}`,
            email,
            emailHash: createHash('sha256').update(email).digest('hex'),
            name: dto.candidateName || email.split('@')[0],
            headline: 'Candidate',
          },
        });
      }
      candidateId = candidate.id;
    }

    if (!candidateId) {
      let candidate = await this.prisma.candidateProfile.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (!candidate) {
        candidate = await this.prisma.candidateProfile.create({
          data: {
            auth0Sub: `guest_${randomUUID()}`,
            email: `candidate_${Date.now()}@questedge.com`,
            emailHash: createHash('sha256').update(`candidate_${Date.now()}@questedge.com`).digest('hex'),
            name: dto.candidateName || 'Candidate',
            headline: 'Candidate',
          },
        });
      }
      candidateId = candidate.id;
    }

    // Check if an existing attempt exists for this candidate
    const existing = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId, candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        assessment: { select: { id: true, title: true, type: true, durationMinutes: true, totalPoints: true } },
        candidateProfile: { select: { id: true, name: true, email: true } },
      },
    });

    if (existing) {
      // If completed or timed out, require explicit allowRetake override
      if (existing.status === 'COMPLETED' || existing.status === 'TIMED_OUT') {
        if (!dto.allowRetake) {
          throw new ConflictException({
            message: `Candidate has already completed this assessment (Score: ${existing.score} pts / ${Number(existing.percentage).toFixed(1)}%).`,
            details: {
              alreadyCompleted: true,
              attemptId: existing.id,
              score: existing.score,
              percentage: Number(existing.percentage).toFixed(1),
              passed: existing.passed,
              completedAt: existing.completedAt,
              candidateName: existing.candidateProfile?.name || 'Candidate',
            },
          });
        }
      } else {
        // Pending attempt (NOT_STARTED or IN_PROGRESS)
        return existing;
      }
    }

    const accessToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    return this.prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        candidateId,
        applicationId: dto.applicationId,
        accessToken,
        expiresAt,
        status: 'NOT_STARTED',
      },
      include: {
        assessment: { select: { id: true, title: true, type: true, durationMinutes: true } },
        candidateProfile: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // ── Candidate-Facing (Public / Token-Based) ───────────────────

  async getAttemptByToken(token: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { accessToken: token },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                text: true,
                options: true, // We'll strip isCorrect on the client side below
                type: true,
                category: true,
                difficulty: true,
                points: true,
                orderIndex: true,
              },
            },
            codingChallenges: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                constraints: true,
                sampleTestCases: true,
                supportedLanguages: true,
                starterCode: true,
                difficulty: true,
                maxScore: true,
                timeLimitSeconds: true,
                orderIndex: true,
                // NOTE: hiddenTestCases intentionally excluded
              },
            },
          },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Assessment not found or link expired');
    if (new Date() > attempt.expiresAt) {
      throw new BadRequestException('Assessment link has expired');
    }
    // Note: completed attempts are returned so candidate can view completion/scorecard

    // Strip isCorrect from options for candidate view
    const sanitizedAssessment = {
      ...attempt.assessment,
      questions: attempt.assessment.questions.map((q) => ({
        ...q,
        options: (q.options as any[]).map(({ isCorrect, ...rest }) => rest),
      })),
    };

    return {
      ...attempt,
      assessment: sanitizedAssessment,
    };
  }

  async startAttempt(token: string, ipAddress?: string, userAgent?: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { accessToken: token },
    });
    if (!attempt) throw new NotFoundException('Assessment not found');
    if (new Date() > attempt.expiresAt) throw new BadRequestException('Link expired');
    if (attempt.status === 'COMPLETED' || attempt.status === 'TIMED_OUT') {
      throw new BadRequestException('Assessment already completed');
    }

    if (attempt.status === 'IN_PROGRESS') {
      return attempt; // Already started, return existing
    }

    return this.prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });
  }

  // ── Results / Analytics ───────────────────────────────────────

  async getAttemptResults(attemptId: string, orgId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assessment: { orgId },
      },
      include: {
        assessment: { select: { id: true, title: true, type: true, totalPoints: true, passingPercentage: true } },
        candidateProfile: { select: { id: true, name: true, email: true } },
        responses: {
          include: {
            question: { select: { id: true, text: true, options: true, explanation: true, points: true } },
          },
        },
        codeSubmissions: {
          where: { isFinalSubmit: true },
          include: {
            challenge: { select: { id: true, title: true, maxScore: true } },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  async getAssessmentAnalytics(assessmentId: string, orgId: string) {
    await this.verifyAssessmentOwnership(assessmentId, orgId);

    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId, status: { in: ['COMPLETED', 'TIMED_OUT'] } },
      include: {
        candidateProfile: { select: { id: true, name: true, email: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    const totalAttempts = attempts.length;
    const passed = attempts.filter((a) => a.passed).length;
    const avgScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
      : 0;
    const avgPercentage = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + Number(a.percentage), 0) / totalAttempts
      : 0;

    return {
      totalAttempts,
      passed,
      failed: totalAttempts - passed,
      passRate: totalAttempts > 0 ? ((passed / totalAttempts) * 100).toFixed(1) : '0',
      averageScore: Math.round(avgScore),
      averagePercentage: avgPercentage.toFixed(1),
      attempts,
    };
  }

  // ── Anti-Cheat Tracking ───────────────────────────────────────

  async updateAntiCheat(token: string, data: { tabSwitchCount?: number; fullscreenExits?: number }) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { accessToken: token },
    });
    if (!attempt) throw new NotFoundException('Assessment attempt not found');

    if (attempt.status === 'COMPLETED' || attempt.status === 'TIMED_OUT') {
      return { id: attempt.id, tabSwitchCount: attempt.tabSwitchCount, fullscreenExits: attempt.fullscreenExits };
    }

    return this.prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        ...(attempt.status === 'NOT_STARTED' && {
          status: 'IN_PROGRESS',
          startedAt: attempt.startedAt || new Date(),
        }),
        ...(data.tabSwitchCount !== undefined && { tabSwitchCount: data.tabSwitchCount }),
        ...(data.fullscreenExits !== undefined && { fullscreenExits: data.fullscreenExits }),
      },
      select: { id: true, tabSwitchCount: true, fullscreenExits: true },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async verifyAssessmentOwnership(id: string, orgId: string) {
    const assessment = await this.prisma.hiringAssessment.findFirst({
      where: { id, orgId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }
}

