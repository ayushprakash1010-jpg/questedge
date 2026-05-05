import { BadRequestException, Body, Controller, Get, Headers, Logger, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationChannel, Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Msg91Client } from '../../integrations/msg91/msg91.client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommsService } from './comms.service';

@ApiTags('Communications (v2)')
@ApiBearerAuth()
@Controller('api/v2/comms')
export class CommsController {
  constructor(private readonly service: CommsService) {}

  @Get('preferences')
  @ApiOperation({ summary: "Get the current user's notification preferences" })
  myPrefs(@CurrentUser('id') userId: string) {
    return this.service.listPrefs(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Set/clear preference for (eventType, channel)' })
  setPref(
    @CurrentUser('id') userId: string,
    @Body() body: { eventType: string; channel: NotificationChannel; enabled: boolean },
  ) {
    return this.service.setPref(userId, body.eventType, body.channel, body.enabled);
  }

  @Get('cost-report')
  @ApiOperation({ summary: 'Notification cost by channel' })
  @Roles(Role.ADMIN, Role.HR)
  cost(
    @CurrentUser('orgId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.costReport(orgId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}

@ApiTags('Webhooks (v2)')
@Public()
@Controller('api/v2/webhooks/msg91')
export class Msg91WebhookController {
  private readonly logger = new Logger(Msg91WebhookController.name);

  constructor(
    private readonly msg91: Msg91Client,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'MSG91 delivery-receipt webhook' })
  async receive(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
    @Body() body: any,
  ) {
    const raw: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(body ?? {}), 'utf-8');
    if (!this.msg91.verifyWebhook(headers, raw)) {
      this.logger.warn('MSG91 webhook signature failed');
      throw new BadRequestException('Invalid signature');
    }
    const evt = this.msg91.parseDeliveryReceipt(body);
    if (!evt) return { ok: true, parsed: false };
    const log = await this.prisma.notificationLog.findFirst({ where: { providerId: evt.providerId } });
    if (!log) return { ok: true, matched: false };
    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: evt.status as Prisma.NotificationLogUpdateInput['status'],
        deliveredAt: evt.status === 'DELIVERED' ? new Date() : log.deliveredAt,
      },
    });
    return { ok: true, matched: true };
  }
}
