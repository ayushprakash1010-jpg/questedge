import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CalibrationService } from './calibration.service';
import { CreateCalibrationSessionDto, MoveAssessmentDto } from './dto/calibration.dto';

@ApiTags('Calibration (v2)')
@ApiBearerAuth()
@Controller('api/v2/appraisal/calibration')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class CalibrationController {
  constructor(private readonly service: CalibrationService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a calibration session' })
  create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCalibrationSessionDto,
  ) {
    return this.service.create(orgId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List calibration sessions' })
  list(@CurrentUser('orgId') orgId: string, @Query('cycleId') cycleId?: string) {
    return this.service.list(orgId, cycleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a calibration session' })
  findOne(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(orgId, id);
  }

  @Get(':id/board')
  @ApiOperation({ summary: 'Live board: in-scope assessments, distributions, decision log' })
  board(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.board(orgId, id);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move an employee to a different rating bucket (audit-logged)' })
  move(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveAssessmentDto,
  ) {
    return this.service.move(orgId, id, userId, dto);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock & finalise the session — advances cycle to COMMUNICATED' })
  lock(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.lock(orgId, id, userId);
  }
}
