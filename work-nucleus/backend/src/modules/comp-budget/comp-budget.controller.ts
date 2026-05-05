import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompBudgetService } from './comp-budget.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/create-budget.dto';

@ApiTags('Compensation Budget (v2)')
@ApiBearerAuth()
@Controller('api/v2/compensation/budgets')
@Roles(Role.ADMIN, Role.HR)
export class CompBudgetController {
  constructor(private readonly service: CompBudgetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget for a cycle' })
  create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateBudgetDto) {
    return this.service.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets' })
  list(@CurrentUser('orgId') orgId: string, @Query('cycleId') cycleId?: string) {
    if (cycleId) return this.service.findByCycle(orgId, cycleId);
    return this.service.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget' })
  findOne(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update budget (only while DRAFT/IN_REVIEW/APPROVED)' })
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a budget' })
  approve(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.approve(orgId, id, userId);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock a budget — no further matrix/pool edits allowed' })
  lock(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.lock(orgId, id);
  }
}
