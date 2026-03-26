import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { CreateTrainingModuleDto, UpdateTrainingModuleDto } from './dto/training.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Training')
@ApiBearerAuth()
@Controller('api/v1/training-modules')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @ApiOperation({ summary: 'List all training modules with completion status' })
  findAll(@Req() req: any) {
    return this.trainingService.findAll(req.user.orgId, req.user.id);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get user training progress' })
  getProgress(@Req() req: any) {
    return this.trainingService.getProgress(req.user.orgId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training module content' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Create a training module' })
  create(@Body() dto: CreateTrainingModuleDto, @Req() req: any) {
    return this.trainingService.create(req.user.orgId, dto);
  }

  @Post('seed-defaults')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Seed default training modules' })
  seedDefaults(@Req() req: any) {
    return this.trainingService.seedDefaults(req.user.orgId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Update a training module' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTrainingModuleDto) {
    return this.trainingService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a training module' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingService.remove(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a module as completed' })
  markComplete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.trainingService.markComplete(id, req.user.id);
  }
}
