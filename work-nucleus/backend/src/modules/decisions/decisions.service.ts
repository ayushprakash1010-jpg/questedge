import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  MakeDecisionDto,
  UpdateCommunicationDto,
} from './dto/make-decision.dto';
import { DecisionType, ApplicationStatus, Prisma } from '@prisma/client';
import { AiCostService } from '../ai-cost/ai-cost.service';
import { AuditService } from '../audit/audit.service';
import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class DecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly aiCost?: AiCostService,
    @Optional() private readonly audit?: AuditService,
    @Optional() private readonly rewardsService?: RewardsService,
  ) {}

  async makeDecision(
    applicationId: string,
    userId: string,
    dto: MakeDecisionDto,
    orgId?: string,
  ) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: {
        candidate: true,
        hiringPlan: {
          select: {
            id: true,
            title: true,
            designation: true,
            department: true,
            orgId: true,
          },
        },
        decision: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.decision)
      throw new ConflictException('Decision already made for this application');

    const newStatus =
      dto.decision === DecisionType.SELECTED
        ? ApplicationStatus.SELECTED
        : ApplicationStatus.REJECTED;

    // Create decision and update application in transaction
    const decision = await this.prisma.$transaction(async (tx) => {
      const created = await tx.selectionDecision.create({
        data: {
          applicationId,
          decision: dto.decision,
          decidedById: userId,
          decisionNotes: dto.decisionNotes,
          offerCtc: dto.offerCtc ? new Prisma.Decimal(dto.offerCtc) : undefined,
          offerDesignation: dto.offerDesignation,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        },
      });

      // Update application status
      await tx.candidateApplication.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          completedAt: new Date(),
          ...(dto.decision === DecisionType.REJECTED
            ? { rejectionReason: dto.decisionNotes }
            : { selectionNotes: dto.decisionNotes }),
        },
      });

      // Close current stage history
      if (application.currentStageId) {
        await tx.candidateStageHistory.updateMany({
          where: {
            applicationId,
            stageId: application.currentStageId,
            exitedAt: null,
          },
          data: {
            exitedAt: new Date(),
            outcome:
              dto.decision === DecisionType.SELECTED ? 'PASSED' : 'REJECTED',
          },
        });
      }

      // If selected, increment filledRoles
      if (dto.decision === DecisionType.SELECTED) {
        await tx.hiringPlan.update({
          where: { id: application.hiringPlanId },
          data: { filledRoles: { increment: 1 } },
        });
      }

      // Sync linked Referral status when a selection decision is made
      if (application.referralId) {
        await tx.referral.update({
          where: { id: application.referralId },
          data: {
            status:
              dto.decision === DecisionType.SELECTED ? 'SELECTED' : 'REJECTED',
          },
        });
      }

      return created;
    });

    if (dto.decision === DecisionType.SELECTED && application.referralId) {
      await this.rewardsService
        ?.triggerRewardEligibility(application.referralId)
        .catch(() => {});
    }

    // Draft communication via AI (non-blocking)
    this.draftCommunication(decision.id, application, dto).catch(() => {});

    await this.audit?.logSafe({
      orgId: application.hiringPlan?.orgId || orgId,
      userId,
      action: 'DECISION_MADE',
      entityType: 'SELECTION_DECISION',
      entityId: decision.id,
      changes: { applicationId, decision: dto.decision },
    });

    return this.getDecision(applicationId, orgId);
  }

  private async draftCommunication(
    decisionId: string,
    application: any,
    dto: MakeDecisionDto,
  ) {
    // Determine feedback tone from submitted feedback
    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where: { applicationId: application.id, isSubmitted: true },
      select: { recommendation: true },
    });

    let feedbackTone = 'mixed';
    if (feedbacks.length > 0) {
      const positiveCount = feedbacks.filter((f) =>
        ['STRONG_YES', 'YES'].includes(f.recommendation),
      ).length;
      const negativeCount = feedbacks.filter((f) =>
        ['STRONG_NO', 'NO'].includes(f.recommendation),
      ).length;
      if (positiveCount > feedbacks.length * 0.6) feedbackTone = 'positive';
      else if (negativeCount > feedbacks.length * 0.6)
        feedbackTone = 'negative';
    }

    const payload: any = {
      candidate: {
        name: application.candidate.name,
        email: application.candidate.email,
      },
      role: application.hiringPlan.designation,
      company: application.hiringPlan.title,
      department: application.hiringPlan.department,
      decision: dto.decision,
      feedbackTone,
    };

    if (dto.decision === DecisionType.SELECTED) {
      payload.offerDetails = {
        ctc: dto.offerCtc,
        designation: dto.offerDesignation || application.hiringPlan.designation,
        joiningDate: dto.joiningDate,
      };
    }

    const resolvedOrgId = application.hiringPlan?.orgId;
    const roleLabel =
      dto.offerDesignation ||
      application.hiringPlan?.designation ||
      application.hiringPlan?.title ||
      'the role';
    const candidateFirst =
      (application.candidate?.name || 'Candidate').split(' ')[0];
    const fallbackDraft =
      dto.decision === DecisionType.SELECTED
        ? {
            subject: `Congratulations ${application.candidate?.name || ''} — Selection for ${roleLabel}`,
            body: `Hi ${candidateFirst},\n\nWe are delighted to inform you that you have been selected for ${roleLabel} at ${application.hiringPlan?.title || 'our team'}.\n\n${dto.offerCtc ? `Proposed Annual CTC: INR ${Number(dto.offerCtc).toLocaleString('en-IN')}\n` : ''}${dto.joiningDate ? `Target Joining Date: ${new Date(dto.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n` : ''}\nOur HR team will shortly follow up with your formal offer letter for review and acceptance.\n\nWarm regards,\nHiring Team`,
          }
        : {
            subject: `Update on your application for ${roleLabel}`,
            body: `Hi ${candidateFirst},\n\nThank you for taking the time to interview for ${roleLabel}. After careful review with the hiring panel, we will not be moving forward at this stage.\n\nWe truly appreciate your interest and wish you every success ahead.\n\nWarm regards,\nHiring Team`,
          };

    const candidateModels = [
      'gemini-flash-lite-latest',
      this.config.get<string>('GEMINI_MODEL'),
      'gemini-flash-latest',
    ].filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx);

    const rawKey = this.config.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    let draft: { subject: string; body: string } | null = null;

    if (trimmedKey) {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      const prompt = `Draft a communication email for a candidate based on this decision context: ${JSON.stringify(payload)}. Return JSON with "subject" and "body".`;

      for (const model of candidateModels.slice(0, 2)) {
        const startedAtMs = Date.now();
        try {
          let timer: NodeJS.Timeout | undefined;
          const response: any = await Promise.race([
            ai.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: 'application/json', temperature: 0.7 },
            }),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error(`Gemini timeout on ${model} after 10s`)),
                10_000,
              );
            }),
          ]).finally(() => {
            if (timer) clearTimeout(timer);
          });

          await this.aiCost?.logGeminiCall({
            orgId: resolvedOrgId,
            agentName: 'decisions.draft_communication',
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
          if (parsed?.subject && parsed?.body) {
            draft = parsed;
            break;
          }
        } catch (err) {
          await this.aiCost?.logGeminiCall({
            orgId: resolvedOrgId,
            agentName: 'decisions.draft_communication',
            modelUsed: model,
            startedAtMs,
            error: err,
          });
        }
      }
    }

    await this.prisma.selectionDecision
      .update({
        where: { id: decisionId },
        data: { communicationDraft: (draft ?? fallbackDraft) as any },
      })
      .catch(() => {});
  }

  async approveDecision(applicationId: string, userId: string, orgId?: string) {
    const decision = await this.prisma.selectionDecision.findFirst({
      where: {
        applicationId,
        ...(orgId ? { application: { hiringPlan: { orgId } } } : {}),
      },
      include: {
        application: {
          select: { hiringPlan: { select: { orgId: true } } },
        },
      },
    });
    if (!decision) throw new NotFoundException('Decision not found');
    if (decision.approvedById)
      throw new BadRequestException('Decision already approved');

    const updated = await this.prisma.selectionDecision.update({
      where: { id: decision.id },
      data: { approvedById: userId, approvedAt: new Date() },
      include: {
        decidedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    await this.audit?.logSafe({
      orgId: orgId || decision.application?.hiringPlan?.orgId,
      userId,
      action: 'DECISION_APPROVED',
      entityType: 'SELECTION_DECISION',
      entityId: decision.id,
      changes: { applicationId },
    });

    return updated;
  }

  async updateCommunication(
    applicationId: string,
    dto: UpdateCommunicationDto,
    orgId?: string,
  ) {
    const decision = await this.prisma.selectionDecision.findFirst({
      where: {
        applicationId,
        ...(orgId ? { application: { hiringPlan: { orgId } } } : {}),
      },
    });
    if (!decision) throw new NotFoundException('Decision not found');

    return this.prisma.selectionDecision.update({
      where: { id: decision.id },
      data: { communicationDraft: { subject: dto.subject, body: dto.body } },
    });
  }

  async markCommunicationSent(applicationId: string, orgId?: string) {
    const decision = await this.prisma.selectionDecision.findFirst({
      where: {
        applicationId,
        ...(orgId ? { application: { hiringPlan: { orgId } } } : {}),
      },
      include: {
        application: {
          select: { hiringPlan: { select: { orgId: true } } },
        },
      },
    });
    if (!decision) throw new NotFoundException('Decision not found');

    const resolvedOrgId = orgId || decision.application?.hiringPlan?.orgId;
    if (resolvedOrgId) {
      const orgSettings = await this.prisma.orgSettings.findUnique({
        where: { orgId: resolvedOrgId },
      });
      if (
        (orgSettings?.settings as any)?.approvalWorkflowEnabled === true &&
        !decision.approvedById
      ) {
        throw new BadRequestException(
          'Decision approval by ADMIN or HR is required before sending communication (OrgSettings approval workflow enabled).',
        );
      }
    }

    return this.prisma.selectionDecision.update({
      where: { id: decision.id },
      data: { communicationSent: true, communicationSentAt: new Date() },
    });
  }

  async getDecision(applicationId: string, orgId?: string) {
    const decision = await this.prisma.selectionDecision.findFirst({
      where: {
        applicationId,
        ...(orgId ? { application: { hiringPlan: { orgId } } } : {}),
      },
      include: {
        decidedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            hiringPlan: {
              select: { id: true, orgId: true, title: true, designation: true },
            },
          },
        },
      },
    });
    if (!decision)
      throw new NotFoundException('No decision found for this application');

    const resolvedOrgId = orgId || decision.application?.hiringPlan?.orgId;
    const orgSettings = resolvedOrgId
      ? await this.prisma.orgSettings.findUnique({
          where: { orgId: resolvedOrgId },
        })
      : null;
    const approvalWorkflowEnabled = Boolean(
      (orgSettings?.settings as any)?.approvalWorkflowEnabled,
    );

    return {
      ...decision,
      approvalWorkflowEnabled,
      approvalRequired: approvalWorkflowEnabled && !decision.approvedById,
    };
  }

  async getTimeline(applicationId: string, orgId?: string) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: {
        id: applicationId,
        ...(orgId ? { hiringPlan: { orgId } } : {}),
      },
      include: {
        candidate: { select: { name: true } },
        hiringPlan: { select: { title: true } },
        stageHistory: {
          include: { stage: { select: { name: true, stageType: true } } },
          orderBy: { enteredAt: 'asc' },
        },
        feedbacks: {
          where: { isSubmitted: true },
          include: {
            interviewer: { select: { name: true } },
            stage: { select: { name: true } },
          },
          orderBy: { submittedAt: 'asc' },
        },
        decision: {
          include: {
            decidedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!application) throw new NotFoundException('Application not found');

    const events: any[] = [];

    // Application event
    events.push({
      type: 'application',
      date: application.appliedAt,
      title: 'Application Submitted',
      description: `Applied for ${application.hiringPlan.title}`,
    });

    // Stage transitions
    for (const sh of application.stageHistory) {
      events.push({
        type: 'stage_enter',
        date: sh.enteredAt,
        title: `Entered ${sh.stage.name}`,
        description: sh.stage.stageType,
        color: 'blue',
      });
      if (sh.exitedAt) {
        events.push({
          type: 'stage_exit',
          date: sh.exitedAt,
          title: `Completed ${sh.stage.name}`,
          description: sh.outcome || '',
          color:
            sh.outcome === 'PASSED'
              ? 'green'
              : sh.outcome === 'REJECTED'
                ? 'red'
                : 'slate',
        });
      }
    }

    // Feedback events
    for (const fb of application.feedbacks) {
      events.push({
        type: 'feedback',
        date: fb.submittedAt,
        title: `Feedback by ${fb.interviewer.name}`,
        description: `${fb.stage.name} — ${fb.recommendation}`,
        color: 'indigo',
      });
    }

    // Decision
    if (application.decision) {
      events.push({
        type: 'decision',
        date: application.decision.createdAt,
        title:
          application.decision.decision === 'SELECTED'
            ? 'Selected'
            : 'Rejected',
        description: `By ${application.decision.decidedBy.name}`,
        color: application.decision.decision === 'SELECTED' ? 'green' : 'red',
      });

      if (application.decision.communicationSentAt) {
        events.push({
          type: 'communication',
          date: application.decision.communicationSentAt,
          title: 'Communication Sent',
          description: '',
          color: 'green',
        });
      }
    }

    // Sort by date
    events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const totalDays = Math.ceil(
      (Date.now() - new Date(application.appliedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return { candidateName: application.candidate.name, totalDays, events };
  }

  async getDecisionsForPlan(hiringPlanId: string, orgId?: string) {
    return this.prisma.selectionDecision.findMany({
      where: {
        application: {
          hiringPlanId,
          ...(orgId ? { hiringPlan: { orgId } } : {}),
        },
      },
      include: {
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
          },
        },
        decidedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
