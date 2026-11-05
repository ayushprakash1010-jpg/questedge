import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQuestionDto } from '../dto';
import { SubmitQuizDto } from '../dto';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Question CRUD ─────────────────────────────────────────────

  async addQuestion(assessmentId: string, dto: CreateQuestionDto, orgId: string) {
    const assessment = await this.prisma.hiringAssessment.findFirst({
      where: { id: assessmentId, orgId, type: 'QUIZ' },
    });
    if (!assessment) throw new NotFoundException('Quiz assessment not found');

    const created = await this.prisma.assessmentQuestion.create({
      data: {
        assessmentId,
        orgId,
        text: dto.text,
        options: dto.options,
        type: dto.type,
        category: dto.category ?? 'General',
        difficulty: dto.difficulty ?? 'MEDIUM',
        explanation: dto.explanation,
        points: dto.points ?? 1,
        tags: dto.tags ?? [],
        orderIndex: dto.orderIndex ?? 0,
      },
    });

    await this.syncAssessmentTotalPoints(assessmentId);
    return created;
  }

  async updateQuestion(
    assessmentId: string,
    questionId: string,
    dto: Partial<CreateQuestionDto>,
    orgId: string,
  ) {
    const question = await this.prisma.assessmentQuestion.findFirst({
      where: { id: questionId, assessmentId, orgId },
    });
    if (!question) throw new NotFoundException('Question not found');

    const updated = await this.prisma.assessmentQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      },
    });

    await this.syncAssessmentTotalPoints(assessmentId);
    return updated;
  }

  async removeQuestion(assessmentId: string, questionId: string, orgId: string) {
    const question = await this.prisma.assessmentQuestion.findFirst({
      where: { id: questionId, assessmentId, orgId },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.prisma.assessmentQuestion.delete({ where: { id: questionId } });
    await this.syncAssessmentTotalPoints(assessmentId);
  }

  private async syncAssessmentTotalPoints(assessmentId: string) {
    const sum = await this.prisma.assessmentQuestion.aggregate({
      where: { assessmentId },
      _sum: { points: true },
    });
    const totalPoints = sum._sum.points || 0;
    if (totalPoints > 0) {
      await this.prisma.hiringAssessment.update({
        where: { id: assessmentId },
        data: { totalPoints },
      });
    }
  }

  // ── Quiz Submission & Scoring ─────────────────────────────────

  async submitQuiz(token: string, dto: SubmitQuizDto) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        accessToken: token,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
      },
    });
    if (!attempt) {
      const completed = await this.prisma.assessmentAttempt.findFirst({
        where: { accessToken: token, status: 'COMPLETED' },
        include: { assessment: { include: { questions: true } } },
      });
      if (completed) {
        return {
          attemptId: completed.id,
          score: completed.score,
          totalPoints: completed.assessment?.totalPoints ?? 100,
          percentage: Number(completed.percentage).toFixed(1),
          passed: completed.passed ?? false,
          totalQuestions: completed.assessment?.questions?.length ?? 0,
          correctAnswers: 0,
        };
      }
      throw new BadRequestException('No active attempt found');
    }

    const questions = attempt.assessment.questions;
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const totalPossiblePoints =
      questions.reduce((sum, q) => sum + (q.points || 0), 0) ||
      attempt.assessment.totalPoints ||
      100;

    let totalScore = 0;

    interface ValidatedResponse {
      attemptId: string;
      questionId: string;
      selectedOptions: string[];
      textAnswer?: string;
      isCorrect: boolean;
      pointsEarned: number;
      timeTakenMs?: number;
    }

    const responseData: ValidatedResponse[] = [];

    for (const resp of dto.responses) {
      const question = questionMap.get(resp.questionId);
      if (!question) continue;

      const options = (question.options as Array<{ id: string; text: string; isCorrect: boolean }>) || [];
      let isCorrect = false;
      let pointsEarned = 0;

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        // Single correct answer
        const correctOption = options.find((o) => o.isCorrect);
        isCorrect =
          resp.selectedOptions?.length === 1 &&
          resp.selectedOptions[0] === correctOption?.id;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === 'MULTI_SELECT') {
        // All correct options must be selected, no extras
        const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
        const selectedIds = new Set(resp.selectedOptions ?? []);
        isCorrect =
          correctIds.size === selectedIds.size &&
          [...correctIds].every((id) => selectedIds.has(id));
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === 'SUBJECTIVE') {
        // Subjective questions scored manually or via AI later
        isCorrect = false;
        pointsEarned = 0;
      }

      totalScore += pointsEarned;

      responseData.push({
        attemptId: attempt.id,
        questionId: resp.questionId,
        selectedOptions: resp.selectedOptions ?? [],
        textAnswer: resp.textAnswer,
        isCorrect,
        pointsEarned,
        timeTakenMs: resp.timeTakenMs,
      });
    }

    // Save all responses and update attempt in a transaction
    const percentage = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
    const passed = percentage >= attempt.assessment.passingPercentage;

    await this.prisma.$transaction(async (tx) => {
      // Sync assessment totalPoints if needed
      if (attempt.assessment.totalPoints !== totalPossiblePoints && totalPossiblePoints > 0) {
        await tx.hiringAssessment.update({
          where: { id: attempt.assessmentId },
          data: { totalPoints: totalPossiblePoints },
        });
      }

      // Upsert responses (handles re-submission)
      for (const resp of responseData) {
        await tx.assessmentResponse.upsert({
          where: {
            attemptId_questionId: {
              attemptId: resp.attemptId,
              questionId: resp.questionId,
            },
          },
          create: resp,
          update: {
            selectedOptions: resp.selectedOptions,
            textAnswer: resp.textAnswer,
            isCorrect: resp.isCorrect,
            pointsEarned: resp.pointsEarned,
            timeTakenMs: resp.timeTakenMs,
          },
        });
      }

      // Update attempt
      await tx.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'COMPLETED',
          startedAt: attempt.startedAt || new Date(),
          completedAt: new Date(),
          score: totalScore,
          percentage,
          passed,
        },
      });
    });

    return {
      attemptId: attempt.id,
      score: totalScore,
      totalPoints: totalPossiblePoints,
      percentage: percentage.toFixed(1),
      passed,
      totalQuestions: questions.length,
      correctAnswers: responseData.filter((r) => r.isCorrect).length,
    };
  }
}

