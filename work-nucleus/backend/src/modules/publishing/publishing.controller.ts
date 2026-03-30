import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublishingService } from './publishing.service';
import { PublishJobDto } from './dto/publish-job.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Job Publishing')
@ApiBearerAuth()
@Controller('api/v1/hiring-plans/:planId/publish')
@Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Post()
  @ApiOperation({ summary: 'Publish a job description' })
  publish(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser('orgId') orgId: string,
    @Body() dto: PublishJobDto,
  ) {
    return this.publishingService.publish(orgId, planId, dto.channel);
  }

  @Get()
  @ApiOperation({ summary: 'List publishings for a hiring plan' })
  findAll(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.publishingService.findByPlan(orgId, planId);
  }

  @Delete(':publishingId')
  @ApiOperation({ summary: 'Unpublish a job listing' })
  unpublish(
    @Param('publishingId', ParseUUIDPipe) publishingId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.publishingService.unpublish(orgId, publishingId);
  }
}
