import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MakeDecisionDto, UpdateCommunicationDto } from './dto/make-decision.dto';
import { DecisionType, ApplicationStatus, Prisma } from '@prisma/client';

@Injectable()
export class DecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async makeDecision(applicationId: string, userId: string, dto: MakeDecisionDto) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        hiringPlan: { select: { id: true, title: true, designation: true, department: true } },
        decision: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.decision) throw new ConflictException('Decision already made for this application');

    const newStatus = dto.decision === DecisionType.SELECTED
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
            outcome: dto.decision === DecisionType.SELECTED ? 'PASSED' : 'REJECTED',
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

      return created;
    });

    // Draft communication via AI (non-blocking)
    this.draftCommunication(decision.id, application, dto).catch(() => {});

    return this.getDecision(applicationId);
  }

  private async draftCommunication(
    decisionId: string,
    application: any,
    dto: MakeDecisionDto,
  ) {
    const aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');
    const apiKey = this.config.get('INTERNAL_API_KEY', 'dev-internal-key');

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
      else if (negativeCount > feedbacks.length * 0.6) feedbackTone = 'negative';
    }

    const payload: any = {
      candidate: { name: application.candidate.name, email: application.candidate.email },
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

    try {
      const res = await fetch(`${aiServiceUrl}/ai/draft-communication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-API-Key': apiKey },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const draft = await res.json();
        await this.prisma.selectionDecision.update({
          where: { id: decisionId },
          data: { communicationDraft: draft },
        });
      }
    } catch {
      // AI service unavailable — draft can be added manually
    }
  }

  async approveDecision(applicationId: string, userId: string) {
    const decision = await this.prisma.selectionDecision.findUnique({
      where: { applicationId },
    });
    if (!decision) throw new NotFoundException('Decision not found');
    if (decision.approvedById) throw new BadRequestException('Decision already approved');

    return this.prisma.selectionDecision.update({
      where: { id: decision.id },
      data: { approvedById: userId, approvedAt: new Date() },
      include: { decidedBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } },
    });
  }

  async updateCommunication(applicationId: string, dto: UpdateCommunicationDto) {
    const decision = await this.prisma.selectionDecision.findUnique({
      where: { applicationId },
    });
    if (!decision) throw new NotFoundException('Decision not found');

    return this.prisma.selectionDecision.update({
      where: { id: decision.id },
      data: { communicationDraft: { subject: dto.subject, body: dto.body } },
    });
  }

  async markCommunicationSent(applicationId: string) {
    const decision = await this.prisma.selectionDecision.findUnique({
      where: { applicationId },
    });
    if (!decision) throw new NotFoundException('Decision not found');

    return this.prisma.selectionDecision.update({
      where: { id: decision.id },
      data: { communicationSent: true, communicationSentAt: new Date() },
    });
  }

  async getDecision(applicationId: string) {
    const decision = await this.prisma.selectionDecision.findUnique({
      where: { applicationId },
      include: {
        decidedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            hiringPlan: { select: { id: true, title: true, designation: true } },
          },
        },
      },
    });
    if (!decision) throw new NotFoundException('No decision found for this application');
    return decision;
  }

  async getTimeline(applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
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
          color: sh.outcome === 'PASSED' ? 'green' : sh.outcome === 'REJECTED' ? 'red' : 'slate',
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
        title: application.decision.decision === 'SELECTED' ? 'Selected' : 'Rejected',
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
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalDays = Math.ceil(
      (Date.now() - new Date(application.appliedAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    return { candidateName: application.candidate.name, totalDays, events };
  }

  async getDecisionsForPlan(hiringPlanId: string) {
    return this.prisma.selectionDecision.findMany({
      where: { application: { hiringPlanId } },
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
