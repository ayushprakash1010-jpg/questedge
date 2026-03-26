import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PipelineService } from './pipeline.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
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
  ) {
    return this.pipelineService.createStage(planId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stages for a plan' })
  findAll(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.pipelineService.getStages(planId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder stages' })
  reorder(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.pipelineService.reorderStages(planId, dto);
  }

  @Post('default-template')
  @ApiOperation({ summary: 'Create default pipeline template' })
  defaultTemplate(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.pipelineService.createDefaultTemplate(planId);
  }

  @Patch(':stageId')
  @ApiOperation({ summary: 'Update a stage' })
  update(
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelineService.updateStage(stageId, dto);
  }

  @Delete(':stageId')
  @ApiOperation({ summary: 'Delete a stage' })
  remove(@Param('stageId', ParseUUIDPipe) stageId: string) {
    return this.pipelineService.deleteStage(stageId);
  }
}
