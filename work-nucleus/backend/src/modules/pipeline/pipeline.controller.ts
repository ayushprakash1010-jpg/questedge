import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PipelineService } from './pipeline.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Pipeline Stages')
@ApiBearerAuth()
@Controller('api/v1/hiring-plans/:planId/stages')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pipeline stage' })
  create(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateStageDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.pipelineService.createStage(planId, dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stages for a plan' })
  findAll(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.pipelineService.getStages(planId, orgId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder stages' })
  reorder(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: ReorderStagesDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.pipelineService.reorderStages(planId, dto, orgId);
  }

  @Post('default-template')
  @ApiOperation({ summary: 'Create default pipeline template' })
  defaultTemplate(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.pipelineService.createDefaultTemplate(planId, orgId);
  }

  @Patch(':stageId')
  @ApiOperation({ summary: 'Update a stage' })
  update(
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.pipelineService.updateStage(stageId, dto, orgId);
  }

  @Delete(':stageId')
  @ApiOperation({ summary: 'Delete a stage' })
  remove(
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.pipelineService.deleteStage(stageId, orgId);
  }
}
