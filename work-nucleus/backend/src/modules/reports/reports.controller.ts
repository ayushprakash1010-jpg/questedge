import {
  Body,
  Controller,
  Delete,
  Get,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportSource, Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import {
  CreateReportDefinitionDto,
  NaturalLanguageReportDto,
  UpdateReportDefinitionDto,
} from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports (v2)')
@ApiBearerAuth()
@Controller('api/v2/reports')
@Roles(Role.ADMIN, Role.HR)
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a saved report definition' })
  async create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDefinitionDto,
  ) {
    const created = await this.service.create(orgId, userId, dto);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'REPORT_CREATED',
      entityType: 'REPORT_DEFINITION',
      entityId: created?.id,
      changes: { name: dto.name, dataSource: dto.dataSource },
    });
    return created;
  }

  @Get()
  @ApiOperation({ summary: 'List saved reports' })
  list(@CurrentUser('orgId') orgId: string) {
    return this.service.list(orgId);
  }

  @Get('fields')
  @ApiOperation({ summary: 'List available fields per source' })
  fields(@Query('source') source: ReportSource) {
    return this.service.fields(source);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report definition' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report definition' })
  async update(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDefinitionDto,
  ) {
    const updated = await this.service.update(orgId, id, dto);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'REPORT_UPDATED',
      entityType: 'REPORT_DEFINITION',
      entityId: id,
      changes: dto,
    });
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved report definition' })
  async remove(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.remove(orgId, id);
    await this.audit?.logSafe({
      orgId,
      userId,
      action: 'REPORT_DELETED',
      entityType: 'REPORT_DEFINITION',
      entityId: id,
    });
    return result;
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run a saved report' })
  run(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.run(orgId, id);
  }

  @Post('adhoc')
  @ApiOperation({ summary: 'Run an ad-hoc report plan (no persistence)' })
  adhoc(
    @CurrentUser('orgId') orgId: string,
    @Body()
    body: {
      source: ReportSource;
      filters?: any[];
      groupBy?: string[];
      metrics?: any[];
    },
  ) {
    return this.service.runAdhoc(orgId, {
      source: body.source,
      filters: (body.filters ?? []) as any,
      groupBy: body.groupBy ?? [],
      metrics: (body.metrics ?? []) as any,
    });
  }

  @Post('natural-language')
  @ApiOperation({
    summary: 'AI: prompt → ReportDefinition draft (review-then-save)',
  })
  natural(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: NaturalLanguageReportDto,
  ) {
    return this.service.naturalLanguageDraft(dto.prompt, orgId);
  }
}
