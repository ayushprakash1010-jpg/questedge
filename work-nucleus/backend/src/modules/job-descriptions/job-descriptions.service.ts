import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateJdDto } from './dto/generate-jd.dto';
import { UpdateJdDto } from './dto/update-jd.dto';
import { JdStatus } from '@prisma/client';

@Injectable()
export class JobDescriptionsService {
  private readonly logger = new Logger(JobDescriptionsService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.internalApiKey = this.config.get<string>('INTERNAL_API_KEY', 'dev-internal-key');
  }

  async generate(orgId: string, hiringPlanId: string, userId: string, dto: GenerateJdDto) {
    // Fetch the hiring plan with all details
    const plan = await this.prisma.hiringPlan.findFirst({
      where: { id: hiringPlanId, orgId },
      include: {
        skills: { include: { skill: true } },
        hiringManager: { select: { name: true, email: true } },
        organization: { select: { name: true, industry: true } },
      },
    });

    if (!plan) throw new NotFoundException('Hiring plan not found');

    // Determine next version number
    const latestVersion = await this.prisma.jobDescription.findFirst({
      where: { hiringPlanId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Call the Python AI service
    const aiPayload = {
      hiringPlan: {
        title: plan.title,
        industry: plan.industry,
        department: plan.department,
        designation: plan.designation,
        quarter: plan.quarter,
        year: plan.year,
        totalRoles: plan.totalRoles,
        budgetMin: Number(plan.budgetMin),
        budgetMax: Number(plan.budgetMax),
        currency: plan.currency,
        benefits: plan.benefits,
        reportingManagerName: plan.reportingManagerName,
        hodName: plan.hodName,
        teamSize: plan.teamSize,
        teamLevels: plan.teamLevels,
        organizationName: plan.organization?.name,
      },
      skills: plan.skills.map((s) => ({
        name: s.skill.name,
        category: s.skill.category,
        priority: s.priority,
        minProficiency: s.minProficiency,
      })),
      additionalContext: dto.additionalContext || null,
    };

    let aiResponse: any;
    try {
      const res = await fetch(`${this.aiServiceUrl}/ai/generate-jd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': this.internalApiKey,
        },
        body: JSON.stringify(aiPayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`AI service error: ${res.status} - ${errorText}`);
        throw new BadRequestException('Failed to generate JD from AI service');
      }

      aiResponse = await res.json();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`AI service call failed: ${error}`);
      throw new BadRequestException('AI service is unavailable');
    }

    // Save as new JD version
    const jd = await this.prisma.jobDescription.create({
      data: {
        hiringPlanId,
        version: nextVersion,
        content: aiResponse.content || {},
        fitmentMapping: aiResponse.fitmentMapping || {},
        evaluationParameters: aiResponse.evaluationParameters || {},
        generatedByAi: true,
        aiPromptUsed: dto.additionalContext || null,
        status: JdStatus.DRAFT,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    return jd;
  }

  async findLatest(hiringPlanId: string) {
    // Prefer approved, otherwise latest by version
    const approved = await this.prisma.jobDescription.findFirst({
      where: { hiringPlanId, status: JdStatus.APPROVED },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    if (approved) return approved;

    const latest = await this.prisma.jobDescription.findFirst({
      where: { hiringPlanId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    return latest;
  }

  async findOne(id: string) {
    const jd = await this.prisma.jobDescription.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!jd) throw new NotFoundException('Job description not found');
    return jd;
  }

  async update(id: string, dto: UpdateJdDto) {
    const jd = await this.findOne(id);

    if (jd.status === JdStatus.APPROVED || jd.status === JdStatus.PUBLISHED) {
      throw new BadRequestException('Cannot edit an approved or published JD. Create a new version instead.');
    }

    return this.prisma.jobDescription.update({
      where: { id },
      data: {
        ...(dto.content && { content: dto.content }),
        ...(dto.fitmentMapping && { fitmentMapping: dto.fitmentMapping }),
        ...(dto.evaluationParameters && { evaluationParameters: dto.evaluationParameters }),
        generatedByAi: false,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async approve(id: string, userId: string) {
    const jd = await this.findOne(id);

    if (jd.status !== JdStatus.DRAFT && jd.status !== JdStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only DRAFT or PENDING_APPROVAL JDs can be approved');
    }

    return this.prisma.jobDescription.update({
      where: { id },
      data: {
        status: JdStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async listVersions(hiringPlanId: string) {
    return this.prisma.jobDescription.findMany({
      where: { hiringPlanId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
  }
}
