import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobDescriptionsService } from './job-descriptions.service';
import { GenerateJdDto } from './dto/generate-jd.dto';
import { UpdateJdDto } from './dto/update-jd.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Job Descriptions')
@ApiBearerAuth()
@Controller('api/v1/hiring-plans/:planId/jd')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class JobDescriptionsController {
  constructor(private readonly jdService: JobDescriptionsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate JD with AI' })
  generate(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateJdDto,
  ) {
    return this.jdService.generate(orgId, planId, userId, dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest JD (prefers approved)' })
  findLatest(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.jdService.findLatest(planId);
  }

  @Get('versions')
  @ApiOperation({ summary: 'List all JD versions' })
  listVersions(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.jdService.listVersions(planId);
  }

  @Get(':jdId')
  @ApiOperation({ summary: 'Get specific JD by ID' })
  findOne(@Param('jdId', ParseUUIDPipe) jdId: string) {
    return this.jdService.findOne(jdId);
  }

  @Patch(':jdId')
  @ApiOperation({ summary: 'Update JD (manual edit)' })
  update(
    @Param('jdId', ParseUUIDPipe) jdId: string,
    @Body() dto: UpdateJdDto,
  ) {
    return this.jdService.update(jdId, dto);
  }

  @Post(':jdId/approve')
  @ApiOperation({ summary: 'Approve JD' })
  approve(
    @Param('jdId', ParseUUIDPipe) jdId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jdService.approve(jdId, userId);
  }
}
