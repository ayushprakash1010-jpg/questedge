import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReportSource, ReportVisualization } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDefinitionDto, UpdateReportDefinitionDto } from './dto/report.dto';
import { listAvailableFields, ReportRunner, ReportPlan } from './report-runner';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly runner: ReportRunner;
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.runner = new ReportRunner(prisma);
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.internalApiKey = this.config.get<string>('INTERNAL_API_KEY', 'dev-internal-key');
  }

  async create(orgId: string, userId: string, dto: CreateReportDefinitionDto) {
    return this.prisma.reportDefinition.create({
      data: {
        orgId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        dataSource: dto.dataSource,
        filters: (dto.filters ?? []) as Prisma.InputJsonValue,
        groupBy: dto.groupBy ?? [],
        metrics: (dto.metrics ?? []) as Prisma.InputJsonValue,
        visualization: dto.visualization ?? ReportVisualization.TABLE,
        scheduleCron: dto.scheduleCron,
        scheduleTargets: (dto.scheduleTargets ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async list(orgId: string) {
    return this.prisma.reportDefinition.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const r = await this.prisma.reportDefinition.findFirst({ where: { id, orgId } });
    if (!r) throw new NotFoundException('Report not found');
    return r;
  }

  async update(orgId: string, id: string, dto: UpdateReportDefinitionDto) {
    await this.findOne(orgId, id);
    return this.prisma.reportDefinition.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dataSource !== undefined && { dataSource: dto.dataSource }),
        ...(dto.filters !== undefined && { filters: dto.filters as Prisma.InputJsonValue }),
        ...(dto.groupBy !== undefined && { groupBy: dto.groupBy }),
        ...(dto.metrics !== undefined && { metrics: dto.metrics as Prisma.InputJsonValue }),
        ...(dto.visualization !== undefined && { visualization: dto.visualization }),
        ...(dto.scheduleCron !== undefined && { scheduleCron: dto.scheduleCron }),
      },
    });
  }

  async run(orgId: string, id: string) {
    const def = await this.findOne(orgId, id);
    const plan: ReportPlan = {
      source: def.dataSource,
      filters: (def.filters as unknown as ReportPlan['filters']) ?? [],
      groupBy: def.groupBy ?? [],
      metrics: (def.metrics as unknown as ReportPlan['metrics']) ?? [],
    };
    const rows = await this.runner.run(orgId, plan);
    await this.prisma.reportDefinition.update({
      where: { id },
      data: { lastRunAt: new Date() },
    });
    return { definition: def, rows };
  }

  /**
   * Run an ad-hoc plan (no persistence) — used by the builder live-preview.
   */
  async runAdhoc(orgId: string, plan: ReportPlan) {
    return this.runner.run(orgId, plan);
  }

  fields(source: ReportSource) {
    return listAvailableFields(source);
  }

  async naturalLanguageDraft(prompt: string) {
    try {
      const res = await fetch(`${this.aiServiceUrl}/ai/report-builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-API-Key': this.internalApiKey },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      return await res.json();
    } catch (err) {
      this.logger.warn(`NL→Report fallback (${err})`);
      return this.fallbackPlan(prompt);
    }
  }

  /**
   * Trivial keyword-based fallback so the feature still works without AI.
   */
  private fallbackPlan(prompt: string) {
    const lower = prompt.toLowerCase();
    let source: ReportSource = ReportSource.HIRING;
    if (lower.includes('hire')) source = ReportSource.HIRING;
    else if (lower.includes('appraisal') || lower.includes('rating')) source = ReportSource.APPRAISAL;
    else if (lower.includes('compensation') || lower.includes('hike')) source = ReportSource.COMPENSATION;
    else if (lower.includes('bgv') || lower.includes('verification')) source = ReportSource.BGV;
    else if (lower.includes('attrition')) source = ReportSource.ATTRITION;
    return {
      name: prompt.slice(0, 80),
      dataSource: source,
      filters: [],
      groupBy: source === ReportSource.HIRING ? ['department'] : [],
      metrics: [{ field: 'count', agg: 'count' }],
      visualization: ReportVisualization.BAR,
      _fallback: true,
    };
  }
}
