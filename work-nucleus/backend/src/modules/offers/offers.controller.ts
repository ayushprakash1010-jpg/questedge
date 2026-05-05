import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApproveOfferDto } from './dto/approve-offer.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferAiService } from './services/offer-ai.service';
import { OfferApprovalService } from './services/offer-approval.service';
import { OfferESignService } from './services/offer-esign.service';
import { OfferRenderService } from './services/offer-render.service';
import { OffersService } from './offers.service';

@ApiTags('Offers (v2)')
@ApiBearerAuth()
@Controller('api/v2/offers')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class OffersController {
  constructor(
    private readonly service: OffersService,
    private readonly approval: OfferApprovalService,
    private readonly render: OfferRenderService,
    private readonly esign: OfferESignService,
    private readonly ai: OfferAiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft offer for a SELECTED application' })
  create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.service.create(orgId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List offers' })
  list(
    @CurrentUser('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(orgId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one offer with full detail' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a DRAFT offer into the approval chain' })
  submit(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.approval.submitForApproval(orgId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Act on the current pending approval step (approve / changes / reject)' })
  approve(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveOfferDto,
  ) {
    return this.approval.act(orgId, id, userId, dto.decision, dto.comment);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render the offer letter (creates a new doc version)' })
  async renderDoc(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.findOne(orgId, id);
    return this.render.render(id);
  }

  @Post(':id/draft-body')
  @ApiOperation({ summary: 'Generate AI draft for the offer body free-text section' })
  draftBody(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { tone?: string },
  ) {
    return this.ai.draftOfferBody(id, body?.tone);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send the approved offer to the candidate via e-sign' })
  send(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.esign.initiate(orgId, id);
  }

  @Post(':id/refresh-esign')
  @ApiOperation({ summary: 'Force-poll the e-sign provider for current status' })
  refresh(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.esign.refreshStatus(id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke an offer that has not yet been accepted' })
  revoke(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.revoke(orgId, id);
  }
}
