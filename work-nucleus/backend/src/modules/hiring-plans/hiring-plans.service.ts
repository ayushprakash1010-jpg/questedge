import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHiringPlanDto } from './dto/create-hiring-plan.dto';
import { UpdateHiringPlanDto } from './dto/update-hiring-plan.dto';
import { QueryHiringPlansDto } from './dto/query-hiring-plans.dto';
import { HiringPlanStatus, Prisma } from '@prisma/client';

@Injectable()
export class HiringPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: CreateHiringPlanDto) {
    const { skills, ...planData } = dto;

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hiringPlan.create({
        data: {
          ...planData,
          budgetMin: new Prisma.Decimal(planData.budgetMin),
          budgetMax: new Prisma.Decimal(planData.budgetMax),
          benefits: (planData.benefits as string[]) || [],
          orgId,
          createdById: userId,
        },
      });

      if (skills?.length) {
        await tx.hiringPlanSkill.createMany({
          data: skills.map((s) => ({
            hiringPlanId: created.id,
            skillId: s.skillId,
            priority: s.priority,
            minProficiency: s.minProficiency,
          })),
        });
      }

      return created;
    });

    return this.findOne(orgId, plan.id);
  }

  async findAll(orgId: string, query: QueryHiringPlansDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query;

    const where: Prisma.HiringPlanWhereInput = { orgId };
    if (filters.status) where.status = filters.status;
    if (filters.quarter) where.quarter = filters.quarter;
    if (filters.year) where.year = filters.year;
    if (filters.department) where.department = { contains: filters.department, mode: 'insensitive' };
    if (filters.hiringManagerId) where.hiringManagerId = filters.hiringManagerId;

    const [data, total] = await Promise.all([
      this.prisma.hiringPlan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          hiringManager: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          skills: { include: { skill: true } },
        },
      }),
      this.prisma.hiringPlan.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(orgId: string, id: string) {
    const plan = await this.prisma.hiringPlan.findFirst({
      where: { id, orgId },
      include: {
        hiringManager: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        skills: { include: { skill: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!plan) throw new NotFoundException('Hiring plan not found');
    return plan;
  }

  async update(orgId: string, id: string, dto: UpdateHiringPlanDto) {
    await this.findOne(orgId, id);
    const { skills, ...planData } = dto;

    await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.HiringPlanUpdateInput = {};

      if (planData.title !== undefined) updateData.title = planData.title;
      if (planData.industry !== undefined) updateData.industry = planData.industry;
      if (planData.department !== undefined) updateData.department = planData.department;
      if (planData.designation !== undefined) updateData.designation = planData.designation;
      if (planData.quarter !== undefined) updateData.quarter = planData.quarter;
      if (planData.year !== undefined) updateData.year = planData.year;
      if (planData.totalRoles !== undefined) updateData.totalRoles = planData.totalRoles;
      if (planData.budgetMin !== undefined) updateData.budgetMin = new Prisma.Decimal(planData.budgetMin);
      if (planData.budgetMax !== undefined) updateData.budgetMax = new Prisma.Decimal(planData.budgetMax);
      if (planData.currency !== undefined) updateData.currency = planData.currency;
      if (planData.benefits !== undefined) updateData.benefits = planData.benefits as string[];
      if (planData.reportingManagerName !== undefined) updateData.reportingManagerName = planData.reportingManagerName;
      if (planData.hodName !== undefined) updateData.hodName = planData.hodName;
      if (planData.teamSize !== undefined) updateData.teamSize = planData.teamSize;
      if (planData.teamLevels !== undefined) updateData.teamLevels = planData.teamLevels;
      if (planData.notes !== undefined) updateData.notes = planData.notes;
      if (planData.hiringManagerId !== undefined) {
        updateData.hiringManager = { connect: { id: planData.hiringManagerId } };
      }

      await tx.hiringPlan.update({
        where: { id },
        data: updateData,
      });

      if (skills !== undefined) {
        await tx.hiringPlanSkill.deleteMany({ where: { hiringPlanId: id } });
        if (skills.length) {
          await tx.hiringPlanSkill.createMany({
            data: skills.map((s) => ({
              hiringPlanId: id,
              skillId: s.skillId,
              priority: s.priority,
              minProficiency: s.minProficiency,
            })),
          });
        }
      }
    });

    return this.findOne(orgId, id);
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.hiringPlan.update({
      where: { id },
      data: { status: HiringPlanStatus.CANCELLED },
    });
  }

  async clone(orgId: string, id: string, userId: string) {
    const plan = await this.findOne(orgId, id);

    const newPlan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hiringPlan.create({
        data: {
          orgId,
          title: `${plan.title} (Copy)`,
          industry: plan.industry,
          department: plan.department,
          quarter: plan.quarter,
          year: plan.year,
          totalRoles: plan.totalRoles,
          filledRoles: 0,
          status: HiringPlanStatus.DRAFT,
          budgetMin: plan.budgetMin,
          budgetMax: plan.budgetMax,
          currency: plan.currency,
          benefits: plan.benefits as Prisma.JsonArray,
          hiringManagerId: plan.hiringManagerId,
          reportingManagerName: plan.reportingManagerName,
          hodName: plan.hodName,
          teamSize: plan.teamSize,
          teamLevels: plan.teamLevels,
          designation: plan.designation,
          notes: plan.notes,
          createdById: userId,
        },
      });

      if (plan.skills.length) {
        await tx.hiringPlanSkill.createMany({
          data: plan.skills.map((s) => ({
            hiringPlanId: created.id,
            skillId: s.skillId,
            priority: s.priority,
            minProficiency: s.minProficiency,
          })),
        });
      }

      return created;
    });

    return this.findOne(orgId, newPlan.id);
  }

  // Allowed status transitions
  private static readonly TRANSITIONS: Record<HiringPlanStatus, HiringPlanStatus[]> = {
    [HiringPlanStatus.DRAFT]: [HiringPlanStatus.ACTIVE, HiringPlanStatus.CANCELLED],
    [HiringPlanStatus.ACTIVE]: [HiringPlanStatus.COMPLETED, HiringPlanStatus.CANCELLED],
    [HiringPlanStatus.COMPLETED]: [HiringPlanStatus.ACTIVE], // reopen
    [HiringPlanStatus.CANCELLED]: [HiringPlanStatus.DRAFT], // reopen as draft
  };

  async updateStatus(orgId: string, id: string, newStatus: HiringPlanStatus) {
    const plan = await this.findOne(orgId, id);

    const allowed = HiringPlansService.TRANSITIONS[plan.status as HiringPlanStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${plan.status} to ${newStatus}`,
      );
    }

    await this.prisma.hiringPlan.update({
      where: { id },
      data: { status: newStatus },
    });

    return this.findOne(orgId, id);
  }

  async getStats(orgId: string) {
    const [totalActive, totalOpenRoles, filledThisQuarter, avgBudget] = await Promise.all([
      this.prisma.hiringPlan.count({
        where: { orgId, status: HiringPlanStatus.ACTIVE },
      }),
      this.prisma.hiringPlan.aggregate({
        where: { orgId, status: HiringPlanStatus.ACTIVE },
        _sum: { totalRoles: true, filledRoles: true },
      }),
      this.prisma.hiringPlan.aggregate({
        where: {
          orgId,
          status: HiringPlanStatus.ACTIVE,
          quarter: Math.ceil((new Date().getMonth() + 1) / 3),
          year: new Date().getFullYear(),
        },
        _sum: { filledRoles: true },
      }),
      this.prisma.hiringPlan.aggregate({
        where: { orgId, status: HiringPlanStatus.ACTIVE },
        _avg: { budgetMin: true, budgetMax: true },
      }),
    ]);

    const totalRoles = totalOpenRoles._sum.totalRoles || 0;
    const filledRoles = totalOpenRoles._sum.filledRoles || 0;

    return {
      totalActivePlans: totalActive,
      totalOpenRoles: totalRoles - filledRoles,
      filledThisQuarter: filledThisQuarter._sum.filledRoles || 0,
      avgBudgetMin: avgBudget._avg.budgetMin || 0,
      avgBudgetMax: avgBudget._avg.budgetMax || 0,
    };
  }
}
