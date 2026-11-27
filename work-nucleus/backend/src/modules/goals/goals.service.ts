import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GoalStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto, CreateOrgGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Personal goals ────────────────────────────────────────────

  async create(
    orgId: string,
    userId: string,
    userRole: Role,
    dto: CreateGoalDto,
  ) {
    const isHrOrAdmin = userRole === Role.ADMIN || userRole === Role.HR;
    if (
      dto.employeeId !== userId &&
      !isHrOrAdmin &&
      userRole !== Role.HIRING_MANAGER
    ) {
      throw new ForbiddenException(
        'Only ADMIN, HR, or HIRING_MANAGER can create goals for another employee',
      );
    }
    if (dto.employeeId === dto.managerId && !isHrOrAdmin) {
      throw new ForbiddenException(
        'You cannot assign yourself as your own goal reviewer/manager',
      );
    }
    await this.assertCycleInOrg(orgId, dto.cycleId);
    const memberIds = Array.from(new Set([dto.employeeId, dto.managerId]));
    const memberCount = await this.prisma.user.count({
      where: { id: { in: memberIds }, orgId, isActive: true },
    });
    if (memberCount !== memberIds.length) {
      throw new NotFoundException('Employee or manager not found in organization');
    }
    if (dto.alignedToOrgGoalId) {
      const orgGoal = await this.prisma.orgGoal.findFirst({
        where: { id: dto.alignedToOrgGoalId, orgId },
        select: { id: true },
      });
      if (!orgGoal) {
        throw new NotFoundException('Aligned org goal not found in organization');
      }
    }
    await this.assertWeightCapacity(dto.cycleId, dto.employeeId, dto.weight);
    return this.prisma.goal.create({ data: { ...dto } });
  }

  async listForEmployee(orgId: string, cycleId: string, employeeId: string) {
    await this.assertCycleInOrg(orgId, cycleId);
    return this.prisma.goal.findMany({
      where: { cycleId, employeeId },
      include: { alignedToOrgGoal: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listForManager(orgId: string, cycleId: string, managerId: string) {
    await this.assertCycleInOrg(orgId, cycleId);
    return this.prisma.goal.findMany({
      where: { cycleId, managerId },
      include: { employee: { select: { id: true, name: true, email: true } } },
      orderBy: [{ employeeId: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listOrgUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async listForCycle(orgId: string, cycleId: string) {
    await this.assertCycleInOrg(orgId, cycleId);
    return this.prisma.goal.findMany({
      where: { cycleId },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ employeeId: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(
    orgId: string,
    id: string,
    userId: string,
    userRole: Role,
    dto: UpdateGoalDto,
  ) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, cycle: { orgId } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    const isHrOrAdmin = userRole === Role.ADMIN || userRole === Role.HR;
    const isManager = goal.managerId === userId;
    const isEmployee = goal.employeeId === userId;

    if (!isHrOrAdmin && !isManager && !isEmployee) {
      throw new ForbiddenException('You are not authorized to update this goal');
    }
    if ((isEmployee && !isHrOrAdmin) && (dto.managerRating !== undefined || dto.managerComment !== undefined || dto.managerId !== undefined || dto.employeeId !== undefined)) {
      throw new ForbiddenException(
        'Employees cannot modify manager ratings, comments, or ownership on their own goals',
      );
    }
    if (dto.weight !== undefined && dto.weight !== goal.weight) {
      await this.assertWeightCapacity(
        goal.cycleId,
        goal.employeeId,
        dto.weight,
        goal.id,
      );
    }
    return this.prisma.goal.update({ where: { id }, data: { ...dto } });
  }

  async agree(orgId: string, id: string, userId: string, userRole: Role) {
    const g = await this.prisma.goal.findFirst({
      where: { id, cycle: { orgId } },
    });
    if (!g) throw new NotFoundException('Goal not found');
    const isHrOrAdmin = userRole === Role.ADMIN || userRole === Role.HR;
    if (g.employeeId === userId && !isHrOrAdmin) {
      throw new ForbiddenException('Employees cannot self-approve their own goals');
    }
    if (g.managerId !== userId && !isHrOrAdmin) {
      throw new ForbiddenException(
        'Only the assigned manager, ADMIN, or HR can agree to a goal',
      );
    }
    if (g.status === GoalStatus.AGREED) return g;
    return this.prisma.goal.update({
      where: { id },
      data: { status: GoalStatus.AGREED },
    });
  }

  async copyFromPreviousCycle(
    orgId: string,
    fromCycleId: string,
    toCycleId: string,
    employeeId: string,
  ) {
    await this.assertCycleInOrg(orgId, fromCycleId);
    await this.assertCycleInOrg(orgId, toCycleId);
    const previous = await this.prisma.goal.findMany({
      where: { cycleId: fromCycleId, employeeId },
    });
    if (previous.length === 0) return { copied: 0 };
    await this.prisma.goal.createMany({
      data: previous.map((g) => ({
        cycleId: toCycleId,
        employeeId: g.employeeId,
        managerId: g.managerId,
        type: g.type,
        title: g.title,
        description: g.description,
        metrics: g.metrics,
        weight: g.weight,
        alignedToOrgGoalId: g.alignedToOrgGoalId,
        status: GoalStatus.DRAFT,
      })),
    });
    return { copied: previous.length };
  }

  /**
   * Cascade an org goal to a manager's direct reports as personal goals.
   * Creates DRAFT entries; reports edit and the manager approves to AGREED.
   */
  async cascadeOrgGoal(
    orgId: string,
    orgGoalId: string,
    reportIds: string[],
    options: { weight?: number } = {},
  ) {
    const og = await this.prisma.orgGoal.findFirst({
      where: { id: orgGoalId, orgId },
    });
    if (!og) throw new NotFoundException('Org goal not found');
    if (reportIds.length === 0) return { created: 0 };
    const ownerId = og.ownerId ?? reportIds[0];
    await this.prisma.goal.createMany({
      data: reportIds.map((employeeId) => ({
        cycleId: og.cycleId,
        employeeId,
        managerId: ownerId,
        type: 'OKR',
        title: og.title,
        description: og.description ?? undefined,
        metrics: og.metric ?? undefined,
        weight: options.weight ?? 0,
        alignedToOrgGoalId: og.id,
        status: GoalStatus.DRAFT,
      })),
    });
    return { created: reportIds.length };
  }

  // ── Org goals (tree) ──────────────────────────────────────────

  async createOrgGoal(orgId: string, dto: CreateOrgGoalDto) {
    await this.assertCycleInOrg(orgId, dto.cycleId);
    return this.prisma.orgGoal.create({ data: { orgId, ...dto } });
  }

  async listOrgGoals(orgId: string, cycleId: string) {
    return this.prisma.orgGoal.findMany({
      where: { orgId, cycleId },
      include: { owner: { select: { id: true, name: true } }, children: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async assertCycleInOrg(orgId: string, cycleId: string) {
    const c = await this.prisma.appraisalCycle.findFirst({
      where: { id: cycleId, orgId },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Cycle not found');
  }

  /**
   * Goals weights must sum to ≤ 100 across an employee's goals in a cycle —
   * mismatched weights are a common source of opaque rating bugs later.
   */
  private async assertWeightCapacity(
    cycleId: string,
    employeeId: string,
    newWeight: number,
    ignoreGoalId?: string,
  ) {
    const existing = await this.prisma.goal.findMany({
      where: {
        cycleId,
        employeeId,
        ...(ignoreGoalId ? { NOT: { id: ignoreGoalId } } : {}),
      },
      select: { weight: true },
    });
    const total = existing.reduce((s, g) => s + g.weight, 0) + newWeight;
    if (total > 100) {
      throw new BadRequestException(
        `Total goal weight would be ${total}; max allowed is 100`,
      );
    }
  }
}
