import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CycleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppraisalCycleDto } from './dto/create-cycle.dto';

const STAGE_ORDER: CycleStatus[] = [
  CycleStatus.DRAFT,
  CycleStatus.GOAL_SETTING,
  CycleStatus.SELF_ASSESSMENT,
  CycleStatus.MANAGER_REVIEW,
  CycleStatus.PEER_FEEDBACK,
  CycleStatus.CALIBRATION,
  CycleStatus.COMMUNICATED,
  CycleStatus.CLOSED,
];

@Injectable()
export class AppraisalCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateAppraisalCycleDto) {
    if (dto.endDate <= dto.startDate) throw new BadRequestException('endDate must be after startDate');
    return this.prisma.appraisalCycle.create({
      data: {
        orgId,
        name: dto.name,
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        goalSettingDeadline: dto.goalSettingDeadline,
        selfAssessmentDeadline: dto.selfAssessmentDeadline,
        managerReviewDeadline: dto.managerReviewDeadline,
        calibrationDeadline: dto.calibrationDeadline,
        ratingScale: dto.ratingScale as unknown as Prisma.InputJsonValue,
        weights: (dto.weights ?? {}) as unknown as Prisma.InputJsonValue,
        eligibilityRules: (dto.eligibilityRules ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async list(orgId: string) {
    return this.prisma.appraisalCycle.findMany({
      where: { orgId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const c = await this.prisma.appraisalCycle.findFirst({ where: { id, orgId } });
    if (!c) throw new NotFoundException('Cycle not found');
    return c;
  }

  async advanceStage(orgId: string, id: string) {
    const cycle = await this.findOne(orgId, id);
    const idx = STAGE_ORDER.indexOf(cycle.status);
    if (idx < 0 || idx === STAGE_ORDER.length - 1) {
      throw new BadRequestException(`Cycle is already ${cycle.status}; cannot advance further`);
    }
    const nextStatus = STAGE_ORDER[idx + 1];
    await this.guardStageTransition(cycle.id, cycle.status, nextStatus);
    return this.prisma.appraisalCycle.update({
      where: { id },
      data: { status: nextStatus },
    });
  }

  async setStage(orgId: string, id: string, target: CycleStatus) {
    const cycle = await this.findOne(orgId, id);
    if (!STAGE_ORDER.includes(target)) throw new BadRequestException('Invalid stage');
    await this.guardStageTransition(cycle.id, cycle.status, target);
    return this.prisma.appraisalCycle.update({ where: { id }, data: { status: target } });
  }

  /**
   * Safety checks before moving a cycle stage forward. Conservative — surfaces
   * problems rather than silently bypassing them; HR can resolve and retry.
   */
  private async guardStageTransition(cycleId: string, from: CycleStatus, to: CycleStatus) {
    if (to === CycleStatus.SELF_ASSESSMENT) {
      const goalCount = await this.prisma.goal.count({ where: { cycleId } });
      if (goalCount === 0) throw new BadRequestException('No goals exist; populate goals before advancing');
    }
    if (to === CycleStatus.MANAGER_REVIEW) {
      const drafts = await this.prisma.appraisalAssessment.count({
        where: { cycleId, type: 'SELF', status: 'DRAFT' },
      });
      if (drafts > 0) {
        throw new BadRequestException(`${drafts} self-assessments are still in DRAFT`);
      }
    }
    if (to === CycleStatus.CALIBRATION) {
      const pending = await this.prisma.appraisalAssessment.count({
        where: { cycleId, type: 'MANAGER', status: { in: ['DRAFT', 'SUBMITTED'] } },
      });
      if (pending > 0) {
        throw new BadRequestException(`${pending} manager reviews not yet REVIEWED/FINALISED`);
      }
    }
  }

  async reopenAssessment(orgId: string, cycleId: string, employeeId: string, reason: string) {
    if (!reason || reason.length < 5) throw new BadRequestException('Reopen reason required (min 5 chars)');
    await this.findOne(orgId, cycleId);
    const updated = await this.prisma.appraisalAssessment.updateMany({
      where: { cycleId, employeeId },
      data: { status: 'REOPENED' },
    });
    return { reopened: updated.count, reason };
  }
}
