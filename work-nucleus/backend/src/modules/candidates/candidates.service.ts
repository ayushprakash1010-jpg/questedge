import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findUnique({
      where: { orgId_email: { orgId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('A candidate with this email already exists in your organization');
    }

    return this.prisma.candidate.create({
      data: {
        ...dto,
        orgId,
        experienceYears: dto.experienceYears ? new Prisma.Decimal(dto.experienceYears) : null,
        expectedCtc: dto.expectedCtc ? new Prisma.Decimal(dto.expectedCtc) : null,
      },
    });
  }

  async findAll(orgId: string, query: QueryCandidatesDto) {
    const { page = 1, limit = 20, q, source } = query;

    const where: Prisma.CandidateWhereInput = { orgId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (source) where.source = source;

    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          applications: {
            select: {
              id: true,
              hiringPlanId: true,
              status: true,
              hiringPlan: { select: { title: true } },
            },
          },
        },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(orgId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, orgId },
      include: {
        applications: {
          include: {
            hiringPlan: { select: { id: true, title: true, department: true } },
            currentStage: { select: { id: true, name: true, stageType: true } },
            stageHistory: {
              include: { stage: { select: { name: true, stageType: true } } },
              orderBy: { enteredAt: 'asc' },
            },
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async update(orgId: string, id: string, dto: UpdateCandidateDto) {
    await this.findOne(orgId, id);
    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.experienceYears !== undefined && {
          experienceYears: dto.experienceYears ? new Prisma.Decimal(dto.experienceYears) : null,
        }),
        ...(dto.expectedCtc !== undefined && {
          expectedCtc: dto.expectedCtc ? new Prisma.Decimal(dto.expectedCtc) : null,
        }),
      },
    });
  }
}
