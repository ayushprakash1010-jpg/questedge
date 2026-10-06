import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateOrUpdateFeedbackDto } from './dto/create-feedback.dto';
import { Role, Prisma } from '@prisma/client';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createOrUpdateDraft(
    applicationId: string,
    userId: string,
    dto: CreateOrUpdateFeedbackDto,
  ) {
    // Validate application exists
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    // Validate stage belongs to same hiring plan
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, hiringPlanId: application.hiringPlanId },
    });
    if (!stage) throw new BadRequestException('Invalid stage for this application');

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

  async submit(feedbackId: string, userId: string) {
    const feedback = await this.prisma.interviewFeedback.findUnique({
      where: { id: feedbackId },
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
  ) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
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
        stage: { select: { id: true, name: true, stageType: true, stageOrder: true } },
        skillRatings: {
          include: { skill: { select: { id: true, name: true, category: true } } },
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

  async getSkillMatrix(applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where: { applicationId, isSubmitted: true },
      include: {
        interviewer: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, stageOrder: true } },
        skillRatings: {
          include: { skill: { select: { id: true, name: true, category: true } } },
        },
      },
      orderBy: { stage: { stageOrder: 'asc' } },
    });

    // Build matrix: rows = skills, columns = interviewer@stage
    const skillMap: Record<string, { id: string; name: string; category: string }> = {};
    const columns: { interviewerId: string; interviewerName: string; stageId: string; stageName: string }[] = [];
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

    // Build rows grouped by category
    const skills = Object.entries(skillMap).map(([id, skill]) => ({
      ...skill,
      ratings: columns.map((col) => {
        const colKey = `${col.interviewerId}@${col.stageId}`;
        return ratings[id]?.[colKey] ?? null;
      }),
    }));

    // Group by category
    const byCategory: Record<string, typeof skills> = {};
    for (const s of skills) {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    }

    return { columns, skillsByCategory: byCategory };
  }

  async triggerAiSummary(applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        hiringPlan: { select: { title: true, department: true, designation: true } },
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

    const rawKey = this.config.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    let summary: any = {};
    if (!trimmedKey) {
      summary = { overallScore: 80, strengths: ["Good communication"], weaknesses: ["Needs technical prep"], summary: "Mock summary" };
    } else {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      const prompt = `Summarize this interview feedback into a structured JSON candidate scorecard. Context: ${JSON.stringify(payload)}`;
      try {
        const response = await ai.models.generateContent({
          model: this.config.get<string>('GEMINI_MODEL') || 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.2 },
        });
        summary = JSON.parse((response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (err) {
        throw new BadRequestException(`AI summarization failed: ${err.message}`);
      }
    }

    // Store summary in application
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { aiSummary: JSON.stringify(summary) },
    });

    return summary;
  }

  async triggerAiScoring(applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        hiringPlan: { select: { title: true, department: true, designation: true } },
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

    const rawKey = this.config.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    let scoreResult: any = {};
    if (!trimmedKey) {
      scoreResult = { score: 85, reasoning: "Mock score" };
    } else {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      const prompt = `Calculate a final objective score (0-100) for this candidate based on the feedback and scoring weights. Return JSON with a "score" number and "reasoning" string. Context: ${JSON.stringify(payload)}`;
      try {
        const response = await ai.models.generateContent({
          model: this.config.get<string>('GEMINI_MODEL') || 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.2 },
        });
        scoreResult = JSON.parse((response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (err) {
        throw new BadRequestException(`AI scoring failed: ${err.message}`);
      }
    }

    // Store score in application
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { totalScore: new Prisma.Decimal(scoreResult.score) },
    });

    return scoreResult;
  }

  async getFeedbackById(feedbackId: string) {
    const feedback = await this.prisma.interviewFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        stage: { select: { id: true, name: true, stageType: true } },
        skillRatings: {
          include: { skill: { select: { id: true, name: true, category: true } } },
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
