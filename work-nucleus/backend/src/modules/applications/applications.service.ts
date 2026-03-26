import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToPipelineDto } from './dto/add-to-pipeline.dto';
import { MoveCandidateDto } from './dto/move-candidate.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async addToPipeline(hiringPlanId: string, dto: AddToPipelineDto) {
    // Get the first stage
    const firstStage = await this.prisma.pipelineStage.findFirst({
      where: { hiringPlanId },
      orderBy: { stageOrder: 'asc' },
    });

    if (!firstStage) {
      throw new BadRequestException('No pipeline stages configured. Set up the pipeline first.');
    }

    // Check for duplicate application
    const existing = await this.prisma.candidateApplication.findUnique({
      where: { candidateId_hiringPlanId: { candidateId: dto.candidateId, hiringPlanId } },
    });
    if (existing) {
      throw new ConflictException('Candidate already applied to this hiring plan');
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

      return this.getDetail(application.id);
    });
  }

  async getKanbanBoard(hiringPlanId: string) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { hiringPlanId },
      orderBy: { stageOrder: 'asc' },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACTIVE },
          include: {
            candidate: {
              select: {
                id: true, name: true, email: true, currentRole: true,
                currentCompany: true, experienceYears: true,
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
          (Date.now() - new Date(app.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          applicationId: app.id,
          candidateId: app.candidate.id,
          name: app.candidate.name,
          email: app.candidate.email,
          currentRole: app.candidate.currentRole,
          currentCompany: app.candidate.currentCompany,
          experienceYears: app.candidate.experienceYears ? Number(app.candidate.experienceYears) : null,
          totalScore: app.totalScore ? Number(app.totalScore) : null,
          daysInStage,
          stageEnteredAt: app.stageEnteredAt,
        };
      });

      const avgDaysInStage = candidates.length
        ? Math.round(candidates.reduce((sum, c) => sum + c.daysInStage, 0) / candidates.length)
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

  async moveCandidate(applicationId: string, dto: MoveCandidateDto) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: { currentStage: true },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== ApplicationStatus.ACTIVE) {
      throw new BadRequestException('Can only move active applications');
    }

    // Validate target stage is in the same hiring plan
    const targetStage = await this.prisma.pipelineStage.findUnique({
      where: { id: dto.targetStageId },
    });
    if (!targetStage || targetStage.hiringPlanId !== application.hiringPlanId) {
      throw new BadRequestException('Invalid target stage');
    }

    return this.prisma.$transaction(async (tx) => {
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

      return this.getDetail(applicationId);
    });
  }

  async updateStatus(applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    return this.prisma.$transaction(async (tx) => {
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

      return this.getDetail(applicationId);
    });
  }

  async getDetail(applicationId: string) {
    const app = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        hiringPlan: { select: { id: true, title: true, department: true, designation: true } },
        currentStage: { select: { id: true, name: true, stageType: true } },
        stageHistory: {
          include: { stage: { select: { id: true, name: true, stageType: true } } },
          orderBy: { enteredAt: 'asc' },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async getPipelineStats(hiringPlanId: string) {
    const [totalActive, totalSelected, totalRejected, stages] = await Promise.all([
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
          _count: { select: { applications: { where: { status: ApplicationStatus.ACTIVE } } } },
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
      perStage: stages.map((s) => ({ id: s.id, name: s.name, count: s._count.applications })),
    };
  }
}
