import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssessmentStatus, AssessmentType, FeedbackRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutosaveAssessmentDto,
  FinaliseAssessmentDto,
  StartAssessmentDto,
} from './dto/assessment.dto';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.internalApiKey = this.config.get<string>('INTERNAL_API_KEY', 'dev-internal-key');
  }

  async start(orgId: string, dto: StartAssessmentDto) {
    await this.assertCycleInOrg(orgId, dto.cycleId);
    return this.prisma.appraisalAssessment.upsert({
      where: { cycleId_employeeId_type: { cycleId: dto.cycleId, employeeId: dto.employeeId, type: dto.type } },
      update: {},
      create: { ...dto, status: AssessmentStatus.DRAFT },
    });
  }

  async autosave(orgId: string, id: string, userId: string, dto: AutosaveAssessmentDto) {
    const a = await this.findOneInOrg(orgId, id);
    this.assertEditable(a, userId);
    return this.prisma.appraisalAssessment.update({
      where: { id },
      data: {
        ...(dto.formData !== undefined && { formData: dto.formData as Prisma.InputJsonValue }),
        ...(dto.competencyRatings !== undefined && {
          competencyRatings: dto.competencyRatings as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.selfSummary !== undefined && a.type === AssessmentType.SELF && { selfSummary: dto.selfSummary }),
        ...(dto.managerSummary !== undefined &&
          (a.type === AssessmentType.MANAGER || a.type === AssessmentType.SKIP_LEVEL) && {
            managerSummary: dto.managerSummary,
          }),
      },
    });
  }

  async submit(orgId: string, id: string, userId: string) {
    const a = await this.findOneInOrg(orgId, id);
    this.assertEditable(a, userId);

    if (a.type === AssessmentType.SELF) {
      const goalsRollup = await this.computeGoalsRollup(a.cycleId, a.employeeId, 'self');
      return this.prisma.appraisalAssessment.update({
        where: { id },
        data: {
          status: AssessmentStatus.SUBMITTED,
          submittedAt: new Date(),
          goalsRollup: goalsRollup as Prisma.InputJsonValue,
        },
      });
    }

    return this.prisma.appraisalAssessment.update({
      where: { id },
      data: { status: AssessmentStatus.REVIEWED, reviewedAt: new Date() },
    });
  }

  async finalise(orgId: string, id: string, userId: string, dto: FinaliseAssessmentDto) {
    const a = await this.findOneInOrg(orgId, id);
    if (a.type === AssessmentType.SELF) throw new BadRequestException('Cannot finalise a SELF assessment directly');
    if (a.managerId !== userId) throw new BadRequestException('Only the assigned manager can finalise');
    const goalsRollup = await this.computeGoalsRollup(a.cycleId, a.employeeId, 'manager');
    return this.prisma.appraisalAssessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.FINALISED,
        finalRating: dto.finalRating,
        ratingLabel: dto.ratingLabel,
        managerSummary: dto.managerSummary ?? a.managerSummary ?? undefined,
        goalsRollup: goalsRollup as Prisma.InputJsonValue,
        finalisedAt: new Date(),
      },
    });
  }

  async acknowledge(orgId: string, id: string, userId: string) {
    const a = await this.findOneInOrg(orgId, id);
    if (a.employeeId !== userId) throw new BadRequestException('Only the employee can acknowledge');
    if (a.status !== AssessmentStatus.FINALISED) throw new BadRequestException('Assessment is not finalised');
    return this.prisma.appraisalAssessment.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }

  async myAppraisalHome(orgId: string, userId: string) {
    const cycles = await this.prisma.appraisalCycle.findMany({
      where: { orgId, status: { not: 'CLOSED' } },
      orderBy: { startDate: 'desc' },
    });
    const goals = await this.prisma.goal.findMany({
      where: { employeeId: userId, cycle: { orgId, status: { not: 'CLOSED' } } },
      include: { cycle: { select: { id: true, name: true, status: true } } },
    });
    const peerOpen = await this.prisma.peerFeedbackRequest.count({
      where: { reviewerUserId: userId, status: FeedbackRequestStatus.REQUESTED, cycle: { orgId } },
    });
    const myAssessments = await this.prisma.appraisalAssessment.findMany({
      where: { employeeId: userId, cycle: { orgId } },
      select: { id: true, cycleId: true, type: true, status: true, finalRating: true, ratingLabel: true, acknowledgedAt: true },
    });
    return { cycles, goals, peerFeedbackPending: peerOpen, assessments: myAssessments };
  }

  async sideBySide(orgId: string, cycleId: string, employeeId: string) {
    await this.assertCycleInOrg(orgId, cycleId);
    const [self, manager, goals, peerSubmitted] = await Promise.all([
      this.prisma.appraisalAssessment.findUnique({
        where: { cycleId_employeeId_type: { cycleId, employeeId, type: AssessmentType.SELF } },
      }),
      this.prisma.appraisalAssessment.findUnique({
        where: { cycleId_employeeId_type: { cycleId, employeeId, type: AssessmentType.MANAGER } },
      }),
      this.prisma.goal.findMany({ where: { cycleId, employeeId } }),
      this.prisma.peerFeedbackRequest.findMany({
        where: { cycleId, subjectUserId: employeeId, status: FeedbackRequestStatus.SUBMITTED },
      }),
    ]);
    return { self, manager, goals, peerFeedbackCount: peerSubmitted.length };
  }

  /**
   * AI-assisted appraisal summary for managers. Uses the existing
   * communication_drafter agent endpoint with intent=APPRAISAL_SUMMARY (the
   * AI service routes to feedback_summariser if available; this client just
   * proxies whatever shape comes back).
   */
  async aiSuggest(orgId: string, cycleId: string, employeeId: string) {
    const data = await this.sideBySide(orgId, cycleId, employeeId);
    try {
      const rawKey = this.config.get<string>('GEMINI_API_KEY');
      const trimmedKey = rawKey ? rawKey.trim() : null;
      if (!trimmedKey) throw new Error("No API key");
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      const prompt = `Provide an appraisal summary based on self and manager reviews. Return exactly JSON with "strengths" (string array), "growth_areas" (string array), "suggested_rating_range" (number array like [3, 4]), and "suggested_comment". Context: ${JSON.stringify({ self: data.self, manager: data.manager, goals: data.goals, peerFeedbackCount: data.peerFeedbackCount })}`;
      const response = await ai.models.generateContent({
        model: this.config.get<string>('GEMINI_MODEL') || 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      return JSON.parse((response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (err) {
      this.logger.warn(`Appraisal AI suggest failed (${err}); returning rule-based summary`);
      return this.fallbackSummary(data);
    }
  }

  // ── helpers ───────────────────────────────────────────────────

  private async findOneInOrg(orgId: string, id: string) {
    const a = await this.prisma.appraisalAssessment.findFirst({
      where: { id, cycle: { orgId } },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    return a;
  }

  private assertEditable(
    a: { type: AssessmentType; status: AssessmentStatus; employeeId: string; managerId: string },
    userId: string,
  ) {
    if (a.status === AssessmentStatus.FINALISED) throw new BadRequestException('Already finalised');
    if (a.type === AssessmentType.SELF && a.employeeId !== userId) {
      throw new BadRequestException('Only the employee can edit their self-assessment');
    }
    if ((a.type === AssessmentType.MANAGER || a.type === AssessmentType.SKIP_LEVEL) && a.managerId !== userId) {
      throw new BadRequestException('Only the assigned manager can edit this review');
    }
  }

  private async assertCycleInOrg(orgId: string, cycleId: string) {
    const c = await this.prisma.appraisalCycle.findFirst({ where: { id: cycleId, orgId }, select: { id: true } });
    if (!c) throw new NotFoundException('Cycle not found');
  }

  /**
   * Weighted goals score: sum(weight * rating) / sum(weight). Uses self vs
   * manager rating depending on caller.
   */
  private async computeGoalsRollup(cycleId: string, employeeId: string, source: 'self' | 'manager') {
    const goals = await this.prisma.goal.findMany({ where: { cycleId, employeeId } });
    const rated = goals.filter((g) => (source === 'self' ? g.selfRating : g.managerRating) != null);
    const totalWeight = rated.reduce((s, g) => s + g.weight, 0);
    const weighted = rated.reduce(
      (s, g) => s + g.weight * (source === 'self' ? g.selfRating! : g.managerRating!),
      0,
    );
    const score = totalWeight > 0 ? weighted / totalWeight : 0;
    return {
      source,
      totalGoals: goals.length,
      ratedGoals: rated.length,
      totalWeight,
      weightedScore: Number(score.toFixed(2)),
    };
  }

  private fallbackSummary(data: { self: any; manager: any; goals: any[]; peerFeedbackCount: number }) {
    const ratings = data.goals
      .map((g) => g.managerRating ?? g.selfRating)
      .filter((r): r is number => r != null);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return {
      strengths: data.peerFeedbackCount > 0 ? ['Peer feedback received', 'Goals tracked in cycle'] : ['Goals tracked in cycle'],
      growth_areas: ratings.length === 0 ? ['Ratings not yet captured'] : [],
      suggested_rating_range: avg ? [Math.max(1, Math.floor(avg)), Math.min(5, Math.ceil(avg))] : [3, 3],
      suggested_comment: 'AI summariser unavailable; manager should write a free-form comment.',
      _fallback: true,
    };
  }
}
