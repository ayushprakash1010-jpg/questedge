import {
  Body,
  Controller,
  Delete,
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
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';
import { OfferTemplatesService } from './offer-templates.service';

@ApiTags('Offer Templates (v2)')
@ApiBearerAuth()
@Controller('api/v2/offer-templates')
@Roles(Role.ADMIN, Role.HR)
export class OfferTemplatesController {
  constructor(private readonly service: OfferTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create offer letter template' })
  create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOfferTemplateDto,
  ) {
    return this.service.create(orgId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List offer templates for org' })
  list(
    @CurrentUser('orgId') orgId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.list(orgId, { activeOnly: activeOnly === 'true' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one offer template' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update offer template (bumps version on content change)' })
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferTemplateDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate offer template (soft)' })
  deactivate(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deactivate(orgId, id);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview rendered template body with sample data' })
  preview(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { sampleData: Record<string, unknown> },
  ) {
    return this.service.preview(orgId, id, body?.sampleData ?? {});
  }
}
