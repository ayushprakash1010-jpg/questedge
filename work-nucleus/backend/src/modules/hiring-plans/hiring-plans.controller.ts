import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HiringPlansService } from './hiring-plans.service';
import { CreateHiringPlanDto } from './dto/create-hiring-plan.dto';
import { UpdateHiringPlanDto } from './dto/update-hiring-plan.dto';
import { QueryHiringPlansDto } from './dto/query-hiring-plans.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role, HiringPlanStatus } from '@prisma/client';

@ApiTags('Hiring Plans')
@ApiBearerAuth()
@Controller('api/v1/hiring-plans')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class HiringPlansController {
  constructor(private readonly hiringPlansService: HiringPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hiring plan' })
  create(@CurrentUser() user: any, @Body() dto: CreateHiringPlanDto) {
    return this.hiringPlansService.create(user.orgId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List hiring plans with filters' })
  findAll(@CurrentUser() user: any, @Query() query: QueryHiringPlansDto) {
    return this.hiringPlansService.findAll(user.orgId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get hiring plan statistics' })
  getStats(@CurrentUser() user: any) {
    return this.hiringPlansService.getStats(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hiring plan by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.hiringPlansService.findOne(user.orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a hiring plan' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHiringPlanDto,
  ) {
    return this.hiringPlansService.update(user.orgId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update hiring plan status' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: HiringPlanStatus,
  ) {
    return this.hiringPlansService.updateStatus(user.orgId, id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a hiring plan (soft delete)' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.hiringPlansService.remove(user.orgId, id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a hiring plan' })
  clone(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.hiringPlansService.clone(user.orgId, id, user.id);
  }
}
