import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToPipelineDto } from './dto/add-to-pipeline.dto';
import { MoveCandidateDto } from './dto/move-candidate.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';
import { ApplicationStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { RewardsService } from '../rewards/rewards.service';
import { AiCostService } from '../ai-cost/ai-cost.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardsService: RewardsService,
    private readonly config: ConfigService,
    @Optional() private readonly aiCost?: AiCostService,
  ) {}

  async addToPipeline(hiringPlanId: string, dto: AddToPipelineDto, orgId?: string) {
    // P0-04: Verify the hiring plan belongs to the caller's org
    if (orgId) {
      const plan = await this.prisma.hiringPlan.findFirst({
        where: { id: hiringPlanId, orgId },
      });
      if (!plan) throw new NotFoundException('Hiring plan not found');
    }

    // Get the first stage
    const firstStage = await this.prisma.pipelineStage.findFirst({
      where: { hiringPlanId },
      orderBy: { stageOrder: 'asc' },
    });

    if (!firstStage) {
      throw new BadRequestException(
        'No pipeline stages configured. Set up the pipeline first.',
      );
    }

    // Check for duplicate application
    const existing = await this.prisma.candidateApplication.findUnique({
      where: {
        candidateId_hiringPlanId: {
          candidateId: dto.candidateId,
          hiringPlanId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Candidate already applied to this hiring plan',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.candidateApplication.create({
        data: {
          candidateId: dto.candidateId,
          hiringPlanId,
          currentStageId: firstStage.id,
          status: ApplicationStatus.ACTIVE,
        },
      });

      // Record first stage history
      await tx.candidateStageHistory.create({
        data: {
          applicationId: application.id,
          stageId: firstStage.id,
        },
      });

      return this.getDetail(application.id, orgId);
    });
  }

  async getKanbanBoard(hiringPlanId: string, orgId?: string) {
    // P0-04: Verify ownership
    if (orgId) {
      const plan = await this.prisma.hiringPlan.findFirst({
        where: { id: hiringPlanId, orgId },
      });
      if (!plan) throw new NotFoundException('Hiring plan not found');
    }

    const stages = await this.prisma.pipelineStage.findMany({
      where: { hiringPlanId },
      orderBy: { stageOrder: 'asc' },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACTIVE },
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
                email: true,
                currentRole: true,
                currentCompany: true,
                experienceYears: true,
              },
            },
          },
        },
        _count: { select: { applications: true } },
      },
    });

    // Enrich each stage with metrics
    return stages.map((stage) => {
      const candidates = stage.applications.map((app) => {
        const daysInStage = Math.floor(
          (Date.now() - new Date(app.stageEnteredAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return {
          applicationId: app.id,
          candidateId: app.candidate.id,
          name: app.candidate.name,
          email: app.candidate.email,
          currentRole: app.candidate.currentRole,
          currentCompany: app.candidate.currentCompany,
          experienceYears: app.candidate.experienceYears
            ? Number(app.candidate.experienceYears)
            : null,
          totalScore: app.totalScore ? Number(app.totalScore) : null,
          aiMatchScore: app.aiMatchScore ? Number(app.aiMatchScore) : null,
          daysInStage,
          stageEnteredAt: app.stageEnteredAt,
        };
      });

      const avgDaysInStage = candidates.length
        ? Math.round(
            candidates.reduce((sum, c) => sum + c.daysInStage, 0) /
              candidates.length,
          )
        : 0;

      return {
        id: stage.id,
        name: stage.name,
        stageType: stage.stageType,
        stageOrder: stage.stageOrder,
        maxDurationDays: stage.maxDurationDays,
        candidateCount: candidates.length,
        avgDaysInStage,
        candidates,
      };
    });
  }

  async moveCandidate(applicationId: string, dto: MoveCandidateDto, orgId?: string) {
    // P0-04: Scope lookup through hiring plan org
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: { currentStage: true },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== ApplicationStatus.ACTIVE) {
      throw new BadRequestException('Can only move active applications');
    }

    // Validate target stage is in the same hiring plan or mandate
    const targetStage = await this.prisma.pipelineStage.findUnique({
      where: { id: dto.targetStageId },
    });
    if (!targetStage) {
      throw new BadRequestException('Target stage not found');
    }

    const isValidHiringPlan =
      application.hiringPlanId &&
      targetStage.hiringPlanId === application.hiringPlanId;
    const isValidMandate =
      application.mandateId && targetStage.mandateId === application.mandateId;

    if (!isValidHiringPlan && !isValidMandate) {
      throw new BadRequestException(
        'Invalid target stage for this application',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Close current stage history
      if (application.currentStageId) {
        await tx.candidateStageHistory.updateMany({
          where: {
            applicationId,
            stageId: application.currentStageId,
            exitedAt: null,
          },
          data: { exitedAt: new Date(), outcome: 'PASSED' },
        });
      }

      // Update application
      await tx.candidateApplication.update({
        where: { id: applicationId },
        data: {
          currentStageId: dto.targetStageId,
          stageEnteredAt: new Date(),
        },
      });

      // Create new stage history
      await tx.candidateStageHistory.create({
        data: {
          applicationId,
          stageId: dto.targetStageId,
        },
      });

      return this.getDetail(applicationId, orgId);
    });

    if (application.referralId) {
      const stageOrder = targetStage.stageOrder;
      const stageType = targetStage.stageType;
      const mappedReferralStatus =
        stageType === 'OFFER' || stageOrder >= 5
          ? 'SELECTED'
          : stageOrder === 4
            ? 'INTERVIEW'
            : stageOrder === 3
              ? 'SHORTLISTED'
              : stageOrder === 2
                ? 'UNDER_REVIEW'
                : 'ACTIVATED';

      await this.prisma.referral
        .update({
          where: { id: application.referralId },
          data: {
            status: mappedReferralStatus as any,
            activatedAt: new Date(),
          },
        })
        .catch(() => {});

      if (mappedReferralStatus === 'SELECTED') {
        await this.rewardsService
          .triggerRewardEligibility(application.referralId)
          .catch(() => {});
      }
    }

    return updated;
  }

  async updateStatus(applicationId: string, dto: UpdateApplicationStatusDto, orgId?: string) {
    // P0-04: Scope lookup through hiring plan org
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: dto.status,
      };

      if (dto.status === ApplicationStatus.REJECTED) {
        updateData.rejectionReason = dto.reason || null;
        updateData.completedAt = new Date();

        // Close current stage history as REJECTED
        if (application.currentStageId) {
          await tx.candidateStageHistory.updateMany({
            where: {
              applicationId,
              stageId: application.currentStageId,
              exitedAt: null,
            },
            data: { exitedAt: new Date(), outcome: 'REJECTED' },
          });
        }
      }

      if (dto.status === ApplicationStatus.SELECTED) {
        updateData.selectionNotes = dto.reason || null;
        updateData.completedAt = new Date();

        // Increment filledRoles on the hiring plan
        await tx.hiringPlan.update({
          where: { id: application.hiringPlanId },
          data: { filledRoles: { increment: 1 } },
        });

        // Close current stage history as PASSED
        if (application.currentStageId) {
          await tx.candidateStageHistory.updateMany({
            where: {
              applicationId,
              stageId: application.currentStageId,
              exitedAt: null,
            },
            data: { exitedAt: new Date(), outcome: 'PASSED' },
          });
        }
      }

      await tx.candidateApplication.update({
        where: { id: applicationId },
        data: updateData,
      });

      return this.getDetail(applicationId, orgId);
    });

    if (application.referralId) {
      if (dto.status === ApplicationStatus.REJECTED) {
        await this.prisma.referral
          .update({
            where: { id: application.referralId },
            data: { status: 'REJECTED' },
          })
          .catch(() => {});
      } else if (dto.status === ApplicationStatus.SELECTED) {
        await this.prisma.referral
          .update({
            where: { id: application.referralId },
            data: { status: 'SELECTED' },
          })
          .catch(() => {});
        await this.rewardsService
          .triggerRewardEligibility(application.referralId)
          .catch((err) => {
            console.error('Failed to trigger reward eligibility:', err);
          });
      }
    }

    return result;
  }

  async getDetail(applicationId: string, orgId?: string) {
    // P0-04: Scope through hiring plan org to prevent cross-tenant access
    const app = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: {
        candidate: true,
        candidateProfile: { select: { id: true, resumeUrl: true } },
        mandate: { select: { id: true, title: true } },
        hiringPlan: {
          select: {
            id: true,
            title: true,
            department: true,
            designation: true,
          },
        },
        currentStage: { select: { id: true, name: true, stageType: true } },
        stageHistory: {
          include: {
            stage: { select: { id: true, name: true, stageType: true } },
          },
          orderBy: { enteredAt: 'asc' },
        },
        offer: { select: { id: true, status: true } },
        decision: {
          select: {
            id: true,
            decision: true,
            offerCtc: true,
            offerDesignation: true,
            joiningDate: true,
          },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');

    // Backfill resumeUrl from candidateProfile onto candidate if missing
    if (!app.candidate.resumeUrl && app.candidateProfile?.resumeUrl) {
      app.candidate.resumeUrl = app.candidateProfile.resumeUrl;
    }

    return app;
  }

  async getPipelineStats(hiringPlanId: string, orgId?: string) {
    // P0-04: Verify ownership
    if (orgId) {
      const plan = await this.prisma.hiringPlan.findFirst({
        where: { id: hiringPlanId, orgId },
      });
      if (!plan) throw new NotFoundException('Hiring plan not found');
    }

    const [totalActive, totalSelected, totalRejected, stages] =
      await Promise.all([
        this.prisma.candidateApplication.count({
          where: { hiringPlanId, status: ApplicationStatus.ACTIVE },
        }),
        this.prisma.candidateApplication.count({
          where: { hiringPlanId, status: ApplicationStatus.SELECTED },
        }),
        this.prisma.candidateApplication.count({
          where: { hiringPlanId, status: ApplicationStatus.REJECTED },
        }),
        this.prisma.pipelineStage.findMany({
          where: { hiringPlanId },
          orderBy: { stageOrder: 'asc' },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                applications: { where: { status: ApplicationStatus.ACTIVE } },
              },
            },
          },
        }),
      ]);

    const total = totalActive + totalSelected + totalRejected;

    return {
      totalCandidates: total,
      activeCandidates: totalActive,
      selected: totalSelected,
      rejected: totalRejected,
      rejectionRate: total > 0 ? Math.round((totalRejected / total) * 100) : 0,
      perStage: stages.map((s) => ({
        id: s.id,
        name: s.name,
        count: s._count.applications,
      })),
    };
  }

  async generateInterviewQuestions(appId: string, orgId?: string) {
    // P0-04: Scope through hiring plan org
    const app = await this.prisma.candidateApplication.findFirst({
      where: {
        id: appId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: {
        candidate: true,
        candidateProfile: {
          select: {
            skills: true,
            currentDesignation: true,
            currentCompany: true,
            experienceYears: true,
            headline: true,
          },
        },
        mandate: {
          select: {
            title: true,
            department: true,
            mandatorySkills: true,
            requiredExperience: true,
            description: true,
          },
        },
        hiringPlan: {
          include: {
            jobDescriptions: {
              where: { status: 'PUBLISHED' },
              take: 1,
            },
          },
        },
        currentStage: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const candidateName = app.candidate.name;
    const roleTitle = (app as any).mandate?.title || app.hiringPlan.title;
    const department =
      (app as any).mandate?.department || app.hiringPlan.department;
    const currentRole =
      app.candidate.currentRole ||
      (app as any).candidateProfile?.currentDesignation ||
      'Software Professional';
    const currentCompany =
      app.candidate.currentCompany ||
      (app as any).candidateProfile?.currentCompany ||
      'Previous Organization';
    const expYears =
      app.candidate.experienceYears ||
      (app as any).candidateProfile?.experienceYears ||
      '3-5';
    const stageName = app.currentStage?.name || 'Technical Round';
    const stageType = app.currentStage?.stageType || 'TECHNICAL';
    const matchSummary = app.aiMatchSummary || '';
    const candidateSkills = Array.isArray((app as any).candidateProfile?.skills)
      ? (app as any).candidateProfile.skills.slice(0, 12).join(', ')
      : '';
    const roleSkills = Array.isArray((app as any).mandate?.mandatorySkills)
      ? (app as any).mandate.mandatorySkills.slice(0, 12).join(', ')
      : '';

    const rawKey = this.config.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;

    if (trimmedKey) {
      const candidateModels = [
        'gemini-flash-lite-latest',
        this.config.get<string>('GEMINI_MODEL'),
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ].filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx);

      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      const prompt = `You are a Principal Technical Interviewer and Hiring Lead.
Role: ${roleTitle} (${department})
Required Skills: ${roleSkills || 'Core engineering & problem solving'}
Candidate: ${candidateName}
Current Role: ${currentRole} at ${currentCompany} (${expYears} years experience)
Candidate Skills: ${candidateSkills || 'See role context'}
Interview Stage: ${stageName} (${stageType})
AI Match Summary: ${matchSummary}

Generate exactly 5 highly relevant, role-specific interview questions for this specific round.
3 questions should test technical/architectural depth and hands-on decision making based on their background and any skill gaps vs the role.
2 questions should test behavioral competencies, conflict resolution, or team leadership.

Return a JSON array of 5 objects strictly matching this structure:
[
  {
    "id": 1,
    "category": "Architecture & System Design",
    "question": "...",
    "rationale": "Why this question tests their specific background against the role",
    "idealAnswerRubric": "Key indicators of a strong answer",
    "redFlags": "Warning signs or unacceptable responses"
  }
]`;

      for (const model of candidateModels.slice(0, 2)) {
        const startedAtMs = Date.now();
        try {
          let timer: NodeJS.Timeout | undefined;
          const response: any = await Promise.race([
            ai.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: 'application/json', temperature: 0.6 },
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
            orgId: app.hiringPlan.orgId,
            agentName: 'applications.interview_questions',
            modelUsed: model,
            startedAtMs,
            response,
          });

          const parsed = JSON.parse(
            (response.text || '[]')
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim(),
          );

          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              source: 'gemini-ai',
              candidateName,
              roleTitle,
              stageName,
              questions: parsed,
            };
          }
        } catch (err) {
          await this.aiCost?.logGeminiCall({
            orgId: app.hiringPlan.orgId,
            agentName: 'applications.interview_questions',
            modelUsed: model,
            startedAtMs,
            error: err,
          });
        }
      }
    }

    // Role-tailored intelligent fallback
    const fallbackQuestions = [
      {
        id: 1,
        category: 'Core Technical Execution',
        question: `Given your ${expYears} years in ${currentRole}, how have you approached designing scalable backend services when facing sudden throughput spikes?`,
        rationale: `Validates real-world architectural experience matching the requirements for ${roleTitle}.`,
        idealAnswerRubric: 'Discusses caching (Redis), asynchronous queues, DB connection pooling, rate limiting, and observability.',
        redFlags: 'Generic high-level answers without explaining trade-offs or personal contribution.',
      },
      {
        id: 2,
        category: 'System Reliability & Failure Recovery',
        question: `Can you walk me through the most critical production incident you resolved at ${currentCompany}? What was the root cause and post-mortem fix?`,
        rationale: `Assesses troubleshooting methodology and ownership under pressure for ${department}.`,
        idealAnswerRubric: 'Clear timeline, systematic telemetry analysis, blameless RCA, and automated preventive tests.',
        redFlags: 'Blaming others, lack of telemetry understanding, or no preventive safeguards implemented.',
      },
      {
        id: 3,
        category: 'Cross-functional Alignment',
        question: `Describe a situation where product priorities conflicted with engineering quality or technical debt. How did you negotiate the trade-off?`,
        rationale: `Assesses stakeholder management and pragmatic technical decision making.`,
        idealAnswerRubric: 'Quantified technical debt impact, proposed incremental refactoring alongside roadmap milestones.',
        redFlags: 'Dogmatic resistance to business deadlines or total disregard for maintainability.',
      },
      {
        id: 4,
        category: 'Code Quality & Mentorship',
        question: `How do you structure code reviews and enforce architectural consistency within your team? What is your standard for approving a PR?`,
        rationale: `Measures seniority level and impact on team productivity for ${roleTitle}.`,
        idealAnswerRubric: 'Automated linter/CI checks first, focus on business logic, security edge-cases, and constructive feedback.',
        redFlags: 'Nitpicking formatting in manual reviews or rubber-stamping PRs without scrutiny.',
      },
      {
        id: 5,
        category: 'Domain & Problem Solving',
        question: `If you joined ${department} tomorrow, how would you evaluate our current data pipeline and identify the biggest 90-day win?`,
        rationale: `Tests strategic onboarding mindset and immediate value creation potential.`,
        idealAnswerRubric: 'Listens to team pain points, maps customer latency hot spots, focuses on quick measurable improvements.',
        redFlags: 'Assuming complete rewrite without understanding existing constraints and customer needs.',
      },
    ];

    return {
      source: 'curated-evaluator',
      candidateName,
      roleTitle,
      stageName,
      questions: fallbackQuestions,
    };
  }
}
