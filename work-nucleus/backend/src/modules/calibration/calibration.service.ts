import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CalibrationStatus, CycleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCalibrationSessionDto, MoveAssessmentDto } from './dto/calibration.dto';

export interface DecisionLogEntry {
  employeeId: string;
  oldRating: number | null;
  newRating: number;
  reason: string;
  decidedById: string;
  decidedAt: string;
}

@Injectable()
export class CalibrationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: CreateCalibrationSessionDto) {
    const cycle = await this.prisma.appraisalCycle.findFirst({ where: { id: dto.cycleId, orgId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    return this.prisma.calibrationSession.create({
      data: {
        cycleId: dto.cycleId,
        groupName: dto.groupName,
        facilitatorId: userId,
        participantUserIds: dto.participantUserIds,
        scope: dto.scope as Prisma.InputJsonValue,
        targetDistribution: dto.targetDistribution as Prisma.InputJsonValue,
        scheduledAt: dto.scheduledAt,
      },
    });
  }

  async list(orgId: string, cycleId?: string) {
    return this.prisma.calibrationSession.findMany({
      where: { cycle: { orgId }, ...(cycleId && { cycleId }) },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const s = await this.prisma.calibrationSession.findFirst({
      where: { id, cycle: { orgId } },
      include: { cycle: { select: { id: true, name: true, ratingScale: true } } },
    });
    if (!s) throw new NotFoundException('Calibration session not found');
    return s;
  }

  /**
   * Returns the live board: assessments in scope + computed distribution +
   * equity slice metrics. Re-runs server-side on every drag-drop tick.
   */
  async board(orgId: string, sessionId: string) {
    const session = await this.findOne(orgId, sessionId);
    const target = session.targetDistribution as Record<string, number>;

    const assessments = await this.prisma.appraisalAssessment.findMany({
      where: {
        cycleId: session.cycleId,
        type: 'MANAGER',
        status: { in: ['REVIEWED', 'FINALISED'] },
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    const actual: Record<string, number> = {};
    for (const a of assessments) {
      const r = a.finalRating ? Math.round(Number(a.finalRating)) : 0;
      const k = String(r);
      actual[k] = (actual[k] ?? 0) + 1;
    }
    const total = assessments.length || 1;
    const actualPct: Record<string, number> = {};
    for (const k of Object.keys(actual)) {
      actualPct[k] = Math.round((actual[k] / total) * 1000) / 10;
    }

    const decisionLog = (session.decisionLog as unknown as DecisionLogEntry[]) ?? [];

    const moves = decisionLog.length;
    const forceFitWarning = total > 0 && moves / total > 0.1;

    return {
      session,
      assessments,
      target,
      actualCount: actual,
      actualPct,
      decisionLog,
      forceFitWarning,
    };
  }

  /**
   * Move an employee's calibrated rating. Records the decision and re-rates
   * the underlying MANAGER assessment. Locked sessions are immutable.
   */
  async move(orgId: string, sessionId: string, userId: string, dto: MoveAssessmentDto) {
    const session = await this.findOne(orgId, sessionId);
    if (session.status === CalibrationStatus.COMPLETED || session.status === CalibrationStatus.CANCELLED) {
      throw new BadRequestException(`Session is ${session.status}; rating moves are frozen`);
    }
    if (session.facilitatorId !== userId && !session.participantUserIds.includes(userId)) {
      throw new BadRequestException('Not a participant of this session');
    }

    const a = await this.prisma.appraisalAssessment.findUnique({
      where: { cycleId_employeeId_type: { cycleId: session.cycleId, employeeId: dto.employeeId, type: 'MANAGER' } },
    });
    if (!a) throw new NotFoundException('Manager assessment not found for employee');

    const oldRating = a.finalRating ? Number(a.finalRating) : null;
    const log = (session.decisionLog as unknown as DecisionLogEntry[]) ?? [];
    log.push({
      employeeId: dto.employeeId,
      oldRating,
      newRating: dto.newRating,
      reason: dto.reason,
      decidedById: userId,
      decidedAt: new Date().toISOString(),
    });

    await this.prisma.$transaction([
      this.prisma.appraisalAssessment.update({
        where: { id: a.id },
        data: { finalRating: dto.newRating, ratingLabel: `Calibrated to ${dto.newRating}` },
      }),
      this.prisma.calibrationSession.update({
        where: { id: sessionId },
        data: {
          decisionLog: log as unknown as Prisma.InputJsonValue,
          status: CalibrationStatus.IN_PROGRESS,
        },
      }),
    ]);

    return this.board(orgId, sessionId);
  }

  /**
   * Lock & finalise — freezes ratings and advances cycle stage to COMMUNICATED.
   * Communication to employees happens via the manager 1-on-1 ack flow.
   */
  async lock(orgId: string, sessionId: string, userId: string) {
    const session = await this.findOne(orgId, sessionId);
    if (session.facilitatorId !== userId) throw new BadRequestException('Only the facilitator can lock');
    if (session.status === CalibrationStatus.COMPLETED) return session;

    await this.prisma.$transaction([
      this.prisma.calibrationSession.update({
        where: { id: sessionId },
        data: {
          status: CalibrationStatus.COMPLETED,
          lockedAt: new Date(),
          completedAt: new Date(),
        },
      }),
      this.prisma.appraisalCycle.update({
        where: { id: session.cycleId },
        data: { status: CycleStatus.COMMUNICATED },
      }),
    ]);
    return this.findOne(orgId, sessionId);
  }
}
