import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportSource, Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
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
  constructor(private readonly service: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a saved report definition' })
  create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDefinitionDto,
  ) {
    return this.service.create(orgId, userId, dto);
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
  findOne(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report definition' })
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDefinitionDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run a saved report' })
  run(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.run(orgId, id);
  }

  @Post('adhoc')
  @ApiOperation({ summary: 'Run an ad-hoc report plan (no persistence)' })
  adhoc(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { source: ReportSource; filters?: any[]; groupBy?: string[]; metrics?: any[] },
  ) {
    return this.service.runAdhoc(orgId, {
      source: body.source,
      filters: (body.filters ?? []) as any,
      groupBy: body.groupBy ?? [],
      metrics: (body.metrics ?? []) as any,
    });
  }

  @Post('natural-language')
  @ApiOperation({ summary: 'AI: prompt → ReportDefinition draft (review-then-save)' })
  natural(@Body() dto: NaturalLanguageReportDto) {
    return this.service.naturalLanguageDraft(dto.prompt);
  }
}
