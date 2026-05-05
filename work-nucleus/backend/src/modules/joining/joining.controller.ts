import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateChecklistDto } from './dto/checklist.dto';
import { ReviewDocumentDto } from './dto/submit-document.dto';
import { JoiningService } from './joining.service';

@ApiTags('Joining (v2)')
@ApiBearerAuth()
@Controller('api/v2/joining')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class JoiningController {
  constructor(private readonly service: JoiningService) {}

  @Post('checklists')
  @ApiOperation({ summary: 'Create a joining checklist' })
  createChecklist(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.service.createChecklist(orgId, dto);
  }

  @Get('checklists')
  @ApiOperation({ summary: 'List joining checklists' })
  listChecklists(@CurrentUser('orgId') orgId: string) {
    return this.service.listChecklists(orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List all candidate joining records (HR view)' })
  list(
    @CurrentUser('orgId') orgId: string,
    @Query('applicationId') applicationId?: string,
  ) {
    if (applicationId) return this.service.findByCandidateApp(orgId, applicationId);
    return this.service.listForOrg(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one joining record' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOneForOrg(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Assign buddy / reporting manager / set join date' })
  assign(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { buddyUserId?: string; reportingMgrId?: string; joinDate?: string },
  ) {
    return this.service.setBuddyAndManager(orgId, id, {
      buddyUserId: body.buddyUserId,
      reportingMgrId: body.reportingMgrId,
      joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
    });
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review a candidate-submitted document' })
  review(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.service.reviewItem(orgId, id, dto);
  }
}
