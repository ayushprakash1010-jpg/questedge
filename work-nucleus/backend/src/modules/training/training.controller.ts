import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import {
  CreateTrainingModuleDto,
  UpdateTrainingModuleDto,
} from './dto/training.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role, UserType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@ApiTags('Training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
@Controller('api/v1/training-modules')
export class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    @Optional() private readonly audit?: AuditService,
  ) {}

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
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.trainingService.findOne(req.user.orgId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Create a training module' })
  async create(@Body() dto: CreateTrainingModuleDto, @Req() req: any) {
    const created = await this.trainingService.create(req.user.orgId, dto);
    await this.audit?.logSafe({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TRAINING_MODULE_CREATED',
      entityType: 'TRAINING_MODULE',
      entityId: created?.id,
      changes: { title: dto.title },
    });
    return created;
  }

  @Post('seed-defaults')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Seed default training modules' })
  async seedDefaults(@Req() req: any) {
    const result = await this.trainingService.seedDefaults(req.user.orgId);
    await this.audit?.logSafe({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TRAINING_DEFAULTS_SEEDED',
      entityType: 'TRAINING_MODULE',
    });
    return result;
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Update a training module' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingModuleDto,
    @Req() req: any,
  ) {
    const updated = await this.trainingService.update(req.user.orgId, id, dto);
    await this.audit?.logSafe({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TRAINING_MODULE_UPDATED',
      entityType: 'TRAINING_MODULE',
      entityId: id,
      changes: dto,
    });
    return updated;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a training module' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.trainingService.remove(req.user.orgId, id);
    await this.audit?.logSafe({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TRAINING_MODULE_DELETED',
      entityType: 'TRAINING_MODULE',
      entityId: id,
    });
    return result;
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a module as completed' })
  markComplete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.trainingService.markComplete(req.user.orgId, id, req.user.id);
  }
}
