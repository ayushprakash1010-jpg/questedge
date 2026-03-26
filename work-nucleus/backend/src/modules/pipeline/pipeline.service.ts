import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { StageType } from '@prisma/client';

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async createStage(hiringPlanId: string, dto: CreateStageDto) {
    const { interviewers, skillsToEvaluate, ...stageData } = dto;

    // Get the next order position
    const maxOrder = await this.prisma.pipelineStage.findFirst({
      where: { hiringPlanId },
      orderBy: { stageOrder: 'desc' },
      select: { stageOrder: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const stage = await tx.pipelineStage.create({
        data: {
          ...stageData,
          hiringPlanId,
          stageOrder: (maxOrder?.stageOrder ?? 0) + 1,
          skillsToEvaluate: skillsToEvaluate || [],
        },
      });

      if (interviewers?.length) {
        await tx.pipelineStageInterviewer.createMany({
          data: interviewers.map((i) => ({
            stageId: stage.id,
            userId: i.userId,
            isMandatory: i.isMandatory ?? false,
          })),
        });
      }

      return this.getStageById(stage.id);
    });
  }

  async getStages(hiringPlanId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { hiringPlanId },
      orderBy: { stageOrder: 'asc' },
      include: {
        interviewers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async getStageById(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id },
      include: {
        interviewers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    return stage;
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    await this.getStageById(id);
    const { interviewers, skillsToEvaluate, ...stageData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.pipelineStage.update({
        where: { id },
        data: {
          ...stageData,
          ...(skillsToEvaluate !== undefined && { skillsToEvaluate }),
        },
      });

      if (interviewers !== undefined) {
        await tx.pipelineStageInterviewer.deleteMany({ where: { stageId: id } });
        if (interviewers.length) {
          await tx.pipelineStageInterviewer.createMany({
            data: interviewers.map((i) => ({
              stageId: id,
              userId: i.userId,
              isMandatory: i.isMandatory ?? false,
            })),
          });
        }
      }

      return this.getStageById(id);
    });
  }

  async deleteStage(id: string) {
    const stage = await this.getStageById(id);

    // Check if any active candidates are in this stage
    const activeCount = await this.prisma.candidateApplication.count({
      where: { currentStageId: id, status: 'ACTIVE' },
    });

    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot delete stage with ${activeCount} active candidate(s). Move them first.`,
      );
    }

    await this.prisma.pipelineStage.delete({ where: { id } });
    return { deleted: true };
  }

  async reorderStages(hiringPlanId: string, dto: ReorderStagesDto) {
    return this.prisma.$transaction(
      dto.stageIds.map((id, index) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { stageOrder: index + 1 },
        }),
      ),
    );
  }

  async createDefaultTemplate(hiringPlanId: string) {
    const existing = await this.prisma.pipelineStage.count({ where: { hiringPlanId } });
    if (existing > 0) {
      throw new BadRequestException('Pipeline already has stages. Delete them first to use the default template.');
    }

    const defaults: { name: string; stageType: StageType; maxDurationDays: number }[] = [
      { name: 'Screening', stageType: 'SCREENING', maxDurationDays: 3 },
      { name: 'Technical Round 1', stageType: 'TECHNICAL', maxDurationDays: 5 },
      { name: 'Technical Round 2', stageType: 'TECHNICAL', maxDurationDays: 5 },
      { name: 'HR Round', stageType: 'HR', maxDurationDays: 3 },
      { name: 'Leadership', stageType: 'LEADERSHIP', maxDurationDays: 5 },
      { name: 'Offer', stageType: 'OFFER', maxDurationDays: 7 },
    ];

    await this.prisma.pipelineStage.createMany({
      data: defaults.map((d, i) => ({
        hiringPlanId,
        name: d.name,
        stageType: d.stageType,
        stageOrder: i + 1,
        maxDurationDays: d.maxDurationDays,
        skillsToEvaluate: [],
      })),
    });

    return this.getStages(hiringPlanId);
  }
}
