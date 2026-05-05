import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompensationService } from './compensation.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';

@ApiTags('Compensation (v2)')
@ApiBearerAuth()
@Controller('api/v2/compensation')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class CompensationController {
  constructor(private readonly service: CompensationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a compensation package' })
  create(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateCompensationDto,
  ) {
    return this.service.create(orgId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get compensation by id' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update compensation' })
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompensationDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Post('summary')
  @ApiOperation({ summary: 'Compute CTC summary + India slab hint (no persistence)' })
  summary(
    @Body()
    body: {
      fixedAnnual: number;
      variableAnnual?: number;
      joiningBonus?: number;
      retentionBonus?: number;
    },
  ) {
    return this.service.computeCtcSummary({
      fixedAnnual: body.fixedAnnual ?? 0,
      variableAnnual: body.variableAnnual ?? 0,
      joiningBonus: body.joiningBonus ?? 0,
      retentionBonus: body.retentionBonus ?? 0,
    });
  }
}
