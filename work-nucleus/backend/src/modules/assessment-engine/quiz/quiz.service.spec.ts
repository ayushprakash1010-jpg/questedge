import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiScreeningService } from '../../ai-screening/ai-screening.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuestionType, Difficulty } from '@prisma/client';

describe('QuizService', () => {
  let service: QuizService;
  let prisma: any;
  let aiScreening: any;

  beforeEach(async () => {
    prisma = {
      hiringAssessment: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      assessmentQuestion: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { points: 25 } }),
      },
    };

    aiScreening = {
      generateAssessmentQuestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiScreeningService, useValue: aiScreening },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  describe('generateAiQuestions', () => {
    it('should throw NotFoundException if assessment does not exist or org mismatch', async () => {
      prisma.hiringAssessment.findFirst.mockResolvedValue(null);

      await expect(
        service.generateAiQuestions('as-1', { topic: 'React' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delegate to AiScreeningService and return generated questions', async () => {
      prisma.hiringAssessment.findFirst.mockResolvedValue({
        id: 'as-1',
        orgId: 'org-1',
        type: 'QUIZ',
      });

      const mockQuestions = [
        {
          text: 'What is a closure in JavaScript?',
          type: 'MCQ',
          difficulty: 'MEDIUM',
          points: 5,
          category: 'JavaScript',
          explanation: 'Closures have lexical scoping.',
          options: [
            { id: '1', text: 'Option A', isCorrect: true },
            { id: '2', text: 'Option B', isCorrect: false },
          ],
        },
      ];
      aiScreening.generateAssessmentQuestions.mockResolvedValue(mockQuestions);

      const result = await service.generateAiQuestions(
        'as-1',
        {
          topic: 'JavaScript Closures',
          count: 3,
          difficulty: Difficulty.MEDIUM,
          questionType: QuestionType.MCQ,
          pointsPerQuestion: 5,
        },
        'org-1',
      );

      expect(result.assessmentId).toBe('as-1');
      expect(result.totalGenerated).toBe(1);
      expect(result.questions).toEqual(mockQuestions);
      expect(aiScreening.generateAssessmentQuestions).toHaveBeenCalledWith({
        topic: 'JavaScript Closures',
        count: 3,
        difficulty: Difficulty.MEDIUM,
        questionType: QuestionType.MCQ,
        pointsPerQuestion: 5,
        context: undefined,
      });
    });
  });

  describe('batchAddQuestions', () => {
    it('should throw BadRequestException if questions array is empty', async () => {
      prisma.hiringAssessment.findFirst.mockResolvedValue({
        id: 'as-1',
        orgId: 'org-1',
        type: 'QUIZ',
      });

      await expect(
        service.batchAddQuestions('as-1', { questions: [] }, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should insert questions and sync assessment totalPoints', async () => {
      prisma.hiringAssessment.findFirst.mockResolvedValue({
        id: 'as-1',
        orgId: 'org-1',
        type: 'QUIZ',
      });
      prisma.assessmentQuestion.findFirst.mockResolvedValue({ orderIndex: 2 });
      prisma.assessmentQuestion.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'q-new', ...data }),
      );

      const result = await service.batchAddQuestions(
        'as-1',
        {
          questions: [
            {
              text: 'Q1',
              type: QuestionType.MCQ,
              difficulty: Difficulty.MEDIUM,
              points: 5,
              options: [{ id: '1', text: 'A', isCorrect: true }],
            },
            {
              text: 'Q2',
              type: QuestionType.MCQ,
              difficulty: Difficulty.HARD,
              points: 10,
              options: [{ id: '1', text: 'B', isCorrect: true }],
            },
          ],
        },
        'org-1',
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(prisma.assessmentQuestion.create).toHaveBeenCalledTimes(2);
      expect(prisma.hiringAssessment.update).toHaveBeenCalledWith({
        where: { id: 'as-1' },
        data: { totalPoints: 25 },
      });
    });
  });
});
