import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BudgetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class CompBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateBudgetDto) {
    await this.assertCycleInOrg(orgId, dto.cycleId);
    this.validateBudget(dto);
    return this.prisma.appraisalBudget.create({
      data: {
        orgId,
        cycleId: dto.cycleId,
        hikePoolINR: dto.hikePoolINR,
        bonusPoolINR: dto.bonusPoolINR,
        splits: (dto.splits ?? []) as Prisma.InputJsonValue,
        matrix: dto.matrix as Prisma.InputJsonValue,
        bonusMatrix: dto.bonusMatrix as Prisma.InputJsonValue,
        marketCorrection: (dto.marketCorrection ?? []) as Prisma.InputJsonValue,
        retentionRules: (dto.retentionRules ?? []) as Prisma.InputJsonValue,
        hikeCapPct: dto.hikeCapPct ?? 50,
        status: BudgetStatus.DRAFT,
      },
    });
  }

  async list(orgId: string) {
    return this.prisma.appraisalBudget.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCycle(orgId: string, cycleId: string) {
    const b = await this.prisma.appraisalBudget.findFirst({ where: { orgId, cycleId } });
    if (!b) throw new NotFoundException('Budget not found for cycle');
    return b;
  }

  async findOne(orgId: string, id: string) {
    const b = await this.prisma.appraisalBudget.findFirst({ where: { id, orgId } });
    if (!b) throw new NotFoundException('Budget not found');
    return b;
  }

  async update(orgId: string, id: string, dto: UpdateBudgetDto) {
    const b = await this.findOne(orgId, id);
    if (b.status === BudgetStatus.LOCKED || b.status === BudgetStatus.DISTRIBUTED) {
      throw new BadRequestException(`Budget is ${b.status}; create a new one or unlock first`);
    }
    if (dto.matrix || dto.bonusMatrix || dto.hikePoolINR != null) {
      this.validateBudget({
        ...((b as unknown) as CreateBudgetDto),
        ...dto,
      } as CreateBudgetDto);
    }
    return this.prisma.appraisalBudget.update({
      where: { id },
      data: {
        ...(dto.hikePoolINR !== undefined && { hikePoolINR: dto.hikePoolINR }),
        ...(dto.bonusPoolINR !== undefined && { bonusPoolINR: dto.bonusPoolINR }),
        ...(dto.splits !== undefined && { splits: dto.splits as Prisma.InputJsonValue }),
        ...(dto.matrix !== undefined && { matrix: dto.matrix as Prisma.InputJsonValue }),
        ...(dto.bonusMatrix !== undefined && { bonusMatrix: dto.bonusMatrix as Prisma.InputJsonValue }),
        ...(dto.marketCorrection !== undefined && {
          marketCorrection: dto.marketCorrection as Prisma.InputJsonValue,
        }),
        ...(dto.retentionRules !== undefined && {
          retentionRules: dto.retentionRules as Prisma.InputJsonValue,
        }),
        ...(dto.hikeCapPct !== undefined && { hikeCapPct: dto.hikeCapPct }),
      },
    });
  }

  async approve(orgId: string, id: string, userId: string) {
    const b = await this.findOne(orgId, id);
    if (b.status !== BudgetStatus.DRAFT && b.status !== BudgetStatus.IN_REVIEW) {
      throw new BadRequestException('Only DRAFT/IN_REVIEW can be approved');
    }
    return this.prisma.appraisalBudget.update({
      where: { id },
      data: { status: BudgetStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
    });
  }

  async lock(orgId: string, id: string) {
    const b = await this.findOne(orgId, id);
    if (b.status !== BudgetStatus.APPROVED && b.status !== BudgetStatus.DISTRIBUTED) {
      throw new BadRequestException('Only APPROVED/DISTRIBUTED budgets can be locked');
    }
    return this.prisma.appraisalBudget.update({ where: { id }, data: { status: BudgetStatus.LOCKED } });
  }

  // ── Validation ────────────────────────────────────────────────

  /**
   * Reject malformed budgets early — these surface as opaque allocator failures
   * later if not caught. Conservative rules: pool ≥ 0, splits sum within ±1%
   * of pool, matrix keys monotonic non-decreasing, all percents non-negative.
   */
  private validateBudget(dto: CreateBudgetDto) {
    if (dto.hikePoolINR < 0 || dto.bonusPoolINR < 0) {
      throw new BadRequestException('Pools cannot be negative');
    }

    const matrixKeys = Object.keys(dto.matrix)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const matrixValues = matrixKeys.map((k) => dto.matrix[String(k)]);
    if (matrixValues.some((v) => v < 0)) {
      throw new BadRequestException('Matrix percents must be non-negative');
    }
    for (let i = 1; i < matrixValues.length; i++) {
      if (matrixValues[i] < matrixValues[i - 1]) {
        throw new BadRequestException(
          `Matrix not monotonic at rating ${matrixKeys[i]}: ${matrixValues[i]} < ${matrixValues[i - 1]}`,
        );
      }
    }

    if (dto.splits && dto.splits.length > 0) {
      const splitTotal = dto.splits.reduce((s, x) => s + (x.hikeINR ?? 0), 0);
      const tolerance = dto.hikePoolINR * 0.01;
      if (Math.abs(splitTotal - dto.hikePoolINR) > tolerance) {
        throw new BadRequestException(
          `Splits sum to ${splitTotal} but pool is ${dto.hikePoolINR}; must be within 1%`,
        );
      }
    }
  }

  private async assertCycleInOrg(orgId: string, cycleId: string) {
    const c = await this.prisma.appraisalCycle.findFirst({
      where: { id: cycleId, orgId },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Cycle not found');
  }
}
