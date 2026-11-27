import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateOrUpdateFeedbackDto } from './dto/create-feedback.dto';
import { Role, Prisma } from '@prisma/client';
import { AiCostService } from '../ai-cost/ai-cost.service';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly aiCost?: AiCostService,
  ) {}

  async createOrUpdateDraft(
    applicationId: string,
    userId: string,
    dto: CreateOrUpdateFeedbackDto,
    orgId?: string,
  ) {
    // Validate application exists within org
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    // Validate stage belongs to same hiring plan
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, hiringPlanId: application.hiringPlanId },
    });
    if (!stage)
      throw new BadRequestException('Invalid stage for this application');

    const { skillRatings, ...feedbackData } = dto;

    const feedback = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.interviewFeedback.upsert({
        where: {
          applicationId_stageId_interviewerId: {
            applicationId,
            stageId: dto.stageId,
            interviewerId: userId,
          },
        },
        create: {
          applicationId,
          stageId: dto.stageId,
          interviewerId: userId,
          overallRating: feedbackData.overallRating,
          recommendation: feedbackData.recommendation,
          qualitativeNotes: feedbackData.qualitativeNotes,
          strengths: feedbackData.strengths,
          concerns: feedbackData.concerns,
          durationMinutes: feedbackData.durationMinutes,
        },
        update: {
          overallRating: feedbackData.overallRating,
          recommendation: feedbackData.recommendation,
          qualitativeNotes: feedbackData.qualitativeNotes,
          strengths: feedbackData.strengths,
          concerns: feedbackData.concerns,
          durationMinutes: feedbackData.durationMinutes,
        },
      });

      // Handle skill ratings
      if (skillRatings?.length) {
        // Delete existing ratings and recreate
        await tx.feedbackSkillRating.deleteMany({
          where: { feedbackId: upserted.id },
        });
        await tx.feedbackSkillRating.createMany({
          data: skillRatings.map((sr) => ({
            feedbackId: upserted.id,
            skillId: sr.skillId,
            rating: sr.rating,
            notes: sr.notes,
          })),
        });
      }

      return upserted;
    });

    return this.getFeedbackById(feedback.id);
  }

  async submit(feedbackId: string, userId: string, orgId?: string) {
    const feedback = await this.prisma.interviewFeedback.findFirst({
      where: {
        id: feedbackId,
        ...(orgId ? { application: { hiringPlan: { orgId } } } : {}),
      },
    });
    if (!feedback) throw new NotFoundException('Feedback not found');
    if (feedback.interviewerId !== userId) {
      throw new ForbiddenException('You can only submit your own feedback');
    }
    if (feedback.isSubmitted) {
      throw new BadRequestException('Feedback already submitted');
    }

    await this.prisma.interviewFeedback.update({
      where: { id: feedbackId },
      data: { isSubmitted: true, submittedAt: new Date() },
    });

    return this.getFeedbackById(feedbackId);
  }

  async getAllForApplication(
    applicationId: string,
    requestingUserId: string,
    requestingUserRole: Role,
    orgId?: string,
  ) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const where: Prisma.InterviewFeedbackWhereInput = { applicationId };

    // INTERVIEWER can only see their own feedback
    if (requestingUserRole === Role.INTERVIEWER) {
      where.interviewerId = requestingUserId;
    }

    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where,
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        stage: {
          select: { id: true, name: true, stageType: true, stageOrder: true },
        },
        skillRatings: {
          include: {
            skill: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: [{ stage: { stageOrder: 'asc' } }, { createdAt: 'asc' }],
    });

    // Group by stage
    const grouped: Record<string, { stage: any; feedbacks: any[] }> = {};
    for (const fb of feedbacks) {
      const stageId = fb.stageId;
      if (!grouped[stageId]) {
        grouped[stageId] = { stage: fb.stage, feedbacks: [] };
      }
      grouped[stageId].feedbacks.push(fb);
    }

    return Object.values(grouped);
  }

  async getSkillMatrix(applicationId: string, orgId?: string) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where: { applicationId, isSubmitted: true },
      include: {
        interviewer: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, stageOrder: true } },
        skillRatings: {
          include: {
            skill: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { stage: { stageOrder: 'asc' } },
    });

    // Build matrix: rows = skills, columns = interviewer@stage
    const skillMap: Record<
      string,
      { id: string; name: string; category: string }
    > = {};
    const columns: {
      interviewerId: string;
      interviewerName: string;
      stageId: string;
      stageName: string;
    }[] = [];
    const ratings: Record<string, Record<string, number>> = {}; // skillId -> columnKey -> rating

    for (const fb of feedbacks) {
      const colKey = `${fb.interviewerId}@${fb.stageId}`;
      columns.push({
        interviewerId: fb.interviewer.id,
        interviewerName: fb.interviewer.name,
        stageId: fb.stage.id,
        stageName: fb.stage.name,
      });

      for (const sr of fb.skillRatings) {
        skillMap[sr.skillId] = sr.skill;
        if (!ratings[sr.skillId]) ratings[sr.skillId] = {};
        ratings[sr.skillId][colKey] = sr.rating;
      }
    }

    return {
      skills: Object.values(skillMap),
      columns,
      ratings,
    };
  }

  async triggerAiSummary(applicationId: string, orgId?: string) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: {
        candidate: true,
        hiringPlan: {
          select: {
            orgId: true,
            title: true,
            department: true,
            designation: true,
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where: { applicationId, isSubmitted: true },
      include: {
        interviewer: { select: { name: true } },
        stage: { select: { name: true, stageType: true } },
        skillRatings: {
          include: { skill: { select: { name: true, category: true } } },
        },
      },
    });

    if (feedbacks.length === 0) {
      throw new BadRequestException('No submitted feedback to summarize');
    }

    const resolvedOrgId = (application.hiringPlan as any)?.orgId || orgId;
    const avgRating =
      feedbacks.reduce((sum, f) => sum + f.overallRating, 0) / feedbacks.length;
    const strengthItems = feedbacks
      .map((f) => f.strengths?.trim())
      .filter((s): s is string => Boolean(s));
    const concernItems = feedbacks
      .map((f) => f.concerns?.trim())
      .filter((s): s is string => Boolean(s));
    const notesPreview = feedbacks
      .map((f) => f.qualitativeNotes?.trim())
      .filter((s): s is string => Boolean(s))
      .slice(0, 2)
      .join(' ');
    const defaultRecommendation =
      avgRating >= 3.5 ? 'hire' : avgRating >= 2.5 ? 'conditional_hire' : 'no_hire';

    const payload = {
      applicationContext: {
        candidateName: application.candidate.name,
        role: application.hiringPlan.designation,
        department: application.hiringPlan.department,
        planTitle: application.hiringPlan.title,
      },
      feedbacks: feedbacks.map((fb) => ({
        interviewer: fb.interviewer.name,
        stage: fb.stage.name,
        stageType: fb.stage.stageType,
        overallRating: fb.overallRating,
        recommendation: fb.recommendation,
        strengths: fb.strengths,
        concerns: fb.concerns,
        qualitativeNotes: fb.qualitativeNotes,
        skillRatings: fb.skillRatings.map((sr) => ({
          skillName: sr.skill.name,
          category: sr.skill.category,
          rating: sr.rating,
          notes: sr.notes,
        })),
      })),
    };

    const prompt = `Summarize this interview feedback into a structured JSON candidate scorecard matching these exact keys:
{
  "overallAssessment": "2-3 concise sentences evaluating the candidate overall",
  "recommendation": "hire" | "conditional_hire" | "no_hire",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "keyStrengths": ["string"],
  "areasOfConcern": ["string"],
  "riskFactors": ["string"],
  "skillAnalysis": [{ "skillName": "string", "category": "string", "averageRating": 4, "assessment": "string" }]
}
Context: ${JSON.stringify(payload)}`;

    const aiSummary = await this.callGeminiJson<Record<string, any>>({
      orgId: resolvedOrgId,
      agentName: 'feedback.summarize',
      prompt,
      temperature: 0.2,
    });

    const summary = {
      overallAssessment:
        (typeof aiSummary?.overallAssessment === 'string' &&
          aiSummary.overallAssessment.trim()) ||
        (typeof aiSummary?.summary === 'string' && aiSummary.summary.trim()) ||
        `${application.candidate.name} averaged ${avgRating.toFixed(1)}/5 across ${feedbacks.length} submitted stage evaluation(s) for ${application.hiringPlan.designation}.${notesPreview ? ` Interviewer notes: ${notesPreview}` : ''}`,
      recommendation:
        typeof aiSummary?.recommendation === 'string' &&
        ['hire', 'conditional_hire', 'no_hire'].includes(
          aiSummary.recommendation.toLowerCase(),
        )
          ? aiSummary.recommendation.toLowerCase()
          : defaultRecommendation,
      confidence:
        typeof aiSummary?.confidence === 'string' && aiSummary.confidence.trim()
          ? aiSummary.confidence.toUpperCase()
          : feedbacks.length >= 2
            ? 'HIGH'
            : 'MEDIUM',
      keyStrengths: Array.isArray(aiSummary?.keyStrengths)
        ? aiSummary.keyStrengths.filter((s: unknown) => typeof s === 'string')
        : Array.isArray(aiSummary?.strengths)
          ? aiSummary.strengths.filter((s: unknown) => typeof s === 'string')
          : strengthItems,
      areasOfConcern: Array.isArray(aiSummary?.areasOfConcern)
        ? aiSummary.areasOfConcern.filter((s: unknown) => typeof s === 'string')
        : Array.isArray(aiSummary?.weaknesses)
          ? aiSummary.weaknesses.filter((s: unknown) => typeof s === 'string')
          : concernItems,
      riskFactors: Array.isArray(aiSummary?.riskFactors)
        ? aiSummary.riskFactors.filter((s: unknown) => typeof s === 'string')
        : concernItems,
      skillAnalysis: Array.isArray(aiSummary?.skillAnalysis)
        ? aiSummary.skillAnalysis
        : [],
    };

    // Store summary in application
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { aiSummary: JSON.stringify(summary) },
    });

    return summary;
  }

  async triggerAiScoring(applicationId: string, orgId?: string) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: {
        candidate: true,
        hiringPlan: {
          select: {
            orgId: true,
            title: true,
            department: true,
            designation: true,
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where: { applicationId, isSubmitted: true },
      include: {
        interviewer: { select: { name: true } },
        stage: { select: { name: true, stageType: true } },
        skillRatings: {
          include: { skill: { select: { name: true, category: true } } },
        },
      },
    });

    if (feedbacks.length === 0) {
      throw new BadRequestException('No submitted feedback to score');
    }

    const resolvedOrgId = (application.hiringPlan as any)?.orgId || orgId;
    const avgRating =
      feedbacks.reduce((sum, f) => sum + f.overallRating, 0) / feedbacks.length;
    const fallbackScore = Math.round((avgRating / 5) * 100);
    const fallbackResult = {
      score: fallbackScore,
      reasoning: `Calculated from ${feedbacks.length} submitted evaluation(s) averaging ${avgRating.toFixed(1)}/5.`,
      confidence: feedbacks.length >= 2 ? 'MEDIUM' : 'LOW',
      breakdown: [],
      keyFactors: feedbacks
        .map((f) => `${f.stage.name}: ${f.overallRating}/5 (${f.recommendation})`)
        .slice(0, 5),
    };

    const orgSettings = resolvedOrgId
      ? await this.prisma.orgSettings.findUnique({
          where: { orgId: resolvedOrgId },
        })
      : null;
    const scoringWeights = (orgSettings?.settings as any)?.scoringWeights || {
      technical: 40,
      leadership: 25,
      behavioural: 20,
      communication: 15,
    };

    const payload = {
      applicationContext: {
        candidateName: application.candidate.name,
        role: application.hiringPlan.designation,
        department: application.hiringPlan.department,
        planTitle: application.hiringPlan.title,
      },
      feedbacks: feedbacks.map((fb) => ({
        interviewer: fb.interviewer.name,
        stage: fb.stage.name,
        stageType: fb.stage.stageType,
        overallRating: fb.overallRating,
        recommendation: fb.recommendation,
        strengths: fb.strengths,
        concerns: fb.concerns,
        qualitativeNotes: fb.qualitativeNotes,
        skillRatings: fb.skillRatings.map((sr) => ({
          skillName: sr.skill.name,
          category: sr.skill.category,
          rating: sr.rating,
          notes: sr.notes,
        })),
      })),
      scoringWeights,
    };

    const prompt = `Calculate a final objective score (0-100) for this candidate based on the feedback and scoring weights. Return JSON with: "score" (number 0-100), "confidence" ("HIGH"|"MEDIUM"|"LOW"), "reasoning" (string), "breakdown" (array of { "category", "score" (1-5), "weight" (number), "weightedScore" (number) }), and "keyFactors" (array of concise factor strings). Context: ${JSON.stringify(payload)}`;

    const aiScore = await this.callGeminiJson<Record<string, any>>({
      orgId: resolvedOrgId,
      agentName: 'feedback.score',
      prompt,
      temperature: 0.2,
    });

    const rawScore = Number(aiScore?.score);
    const validScore = Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : fallbackResult.score;

    const scoreResult = {
      score: validScore,
      confidence:
        typeof aiScore?.confidence === 'string' && aiScore.confidence.trim()
          ? aiScore.confidence.toUpperCase()
          : fallbackResult.confidence,
      reasoning:
        typeof aiScore?.reasoning === 'string' && aiScore.reasoning.trim()
          ? aiScore.reasoning
          : fallbackResult.reasoning,
      breakdown: Array.isArray(aiScore?.breakdown)
        ? aiScore.breakdown.map((b: any) => ({
            category: String(b?.category || 'Overall'),
            score: Number.isFinite(Number(b?.score)) ? Number(b.score) : avgRating,
            weight: Number.isFinite(Number(b?.weight)) ? Number(b.weight) : 25,
            weightedScore: Number.isFinite(Number(b?.weightedScore))
              ? Number(b.weightedScore)
              : 0,
          }))
        : fallbackResult.breakdown,
      keyFactors: Array.isArray(aiScore?.keyFactors)
        ? aiScore.keyFactors.filter((f: unknown) => typeof f === 'string')
        : fallbackResult.keyFactors,
    };

    // Store score in application
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { totalScore: new Prisma.Decimal(scoreResult.score) },
    });

    return scoreResult;
  }

  private async callGeminiJson<T = Record<string, any>>(params: {
    orgId?: string;
    agentName: string;
    prompt: string;
    temperature?: number;
  }): Promise<T | null> {
    const rawKey = this.config.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    if (!trimmedKey) return null;

    const candidateModels = [
      'gemini-flash-lite-latest',
      this.config.get<string>('GEMINI_MODEL'),
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ].filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx);

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: trimmedKey });

    for (const model of candidateModels.slice(0, 2)) {
      const startedAtMs = Date.now();
      try {
        let timer: NodeJS.Timeout | undefined;
        const response: any = await Promise.race([
          ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
            config: {
              responseMimeType: 'application/json',
              temperature: params.temperature ?? 0.2,
            },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`Gemini timeout on ${model} after 12s`)),
              12_000,
            );
          }),
        ]).finally(() => {
          if (timer) clearTimeout(timer);
        });

        await this.aiCost?.logGeminiCall({
          orgId: params.orgId,
          agentName: params.agentName,
          modelUsed: model,
          startedAtMs,
          response,
        });

        const parsed = JSON.parse(
          (response.text || '{}')
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim(),
        );
        if (parsed && typeof parsed === 'object') {
          return parsed as T;
        }
      } catch (err) {
        await this.aiCost?.logGeminiCall({
          orgId: params.orgId,
          agentName: params.agentName,
          modelUsed: model,
          startedAtMs,
          error: err,
        });
      }
    }

    return null;
  }

  async getFeedbackById(feedbackId: string) {
    const feedback = await this.prisma.interviewFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        stage: { select: { id: true, name: true, stageType: true } },
        skillRatings: {
          include: {
            skill: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });
    if (!feedback) throw new NotFoundException('Feedback not found');
    return feedback;
  }

  async getFeedbackCountsForStage(applicationId: string, stageId: string) {
    const [submitted, total] = await Promise.all([
      this.prisma.interviewFeedback.count({
        where: { applicationId, stageId, isSubmitted: true },
      }),
      this.prisma.interviewFeedback.count({
        where: { applicationId, stageId },
      }),
    ]);
    return { submitted, total };
  }
}
