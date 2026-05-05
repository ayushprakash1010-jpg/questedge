import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus, Prisma } from '@prisma/client';
import { Msg91Client } from '../../integrations/msg91/msg91.client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SendOpts {
  orgId: string;
  userId?: string;
  toAddress: string;
  templateKey: string;
  channel: NotificationChannel;
  payload?: Record<string, unknown>;
  /** Bypass quiet hours (for critical security alerts only). */
  ignoreQuietHours?: boolean;
}

const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;

@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly msg91: Msg91Client,
  ) {}

  /**
   * Dispatch a notification respecting per-user channel preferences and quiet
   * hours. Falls through to IN_APP if the requested channel is opted out.
   */
  async send(opts: SendOpts) {
    const allowed = await this.isChannelAllowed(opts.userId, opts.templateKey, opts.channel);
    const channel = allowed ? opts.channel : NotificationChannel.IN_APP;

    if (!opts.ignoreQuietHours && (await this.inQuietHours(opts.userId))) {
      return this.queueForLater(opts, channel);
    }

    const log = await this.prisma.notificationLog.create({
      data: {
        orgId: opts.orgId,
        userId: opts.userId,
        channel,
        templateKey: opts.templateKey,
        toAddress: opts.toAddress,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
        status: NotificationDeliveryStatus.QUEUED,
      },
    });

    try {
      const result = await this.dispatch(channel, opts);
      return this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
          providerId: result?.providerId,
          costInPaise: result?.costInPaise,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`Failed to send ${channel} ${opts.templateKey}: ${msg}`);
      return this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: NotificationDeliveryStatus.FAILED, errorMessage: msg },
      });
    }
  }

  private async dispatch(channel: NotificationChannel, opts: SendOpts) {
    const variables = (opts.payload ?? {}) as Record<string, string>;
    switch (channel) {
      case NotificationChannel.SMS:
        return this.msg91.sendSms({ templateId: opts.templateKey, to: opts.toAddress, variables });
      case NotificationChannel.WHATSAPP:
        return this.msg91.sendWhatsApp({
          templateName: opts.templateKey,
          to: opts.toAddress,
          variables: Object.values(variables).map((v) => String(v)),
        });
      case NotificationChannel.IN_APP:
      case NotificationChannel.EMAIL:
      case NotificationChannel.PUSH:
        // Email/push dispatch happens via the existing NotificationsModule and
        // web-push respectively. Logging the row is enough for now.
        return { providerId: 'inapp', costInPaise: 0 };
    }
  }

  /**
   * Look up the user's per-channel preference for this event type. Default is
   * "enabled" — opt-out is the explicit user choice.
   */
  private async isChannelAllowed(userId: string | undefined, eventType: string, channel: NotificationChannel) {
    if (!userId) return true;
    const pref = await this.prisma.userNotificationPref.findUnique({
      where: { userId_eventType_channel: { userId, eventType, channel } },
    });
    return pref?.enabled ?? true;
  }

  private async inQuietHours(userId?: string): Promise<boolean> {
    if (!userId) return false;
    // Per-user timezone is on roadmap; today everything is IST (Asia/Kolkata).
    const ist = new Date(Date.now() + 330 * 60_000);
    const hour = ist.getUTCHours();
    return hour >= DEFAULT_QUIET_START || hour < DEFAULT_QUIET_END;
  }

  private async queueForLater(opts: SendOpts, channel: NotificationChannel) {
    return this.prisma.notificationLog.create({
      data: {
        orgId: opts.orgId,
        userId: opts.userId,
        channel,
        templateKey: opts.templateKey,
        toAddress: opts.toAddress,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
        status: NotificationDeliveryStatus.QUEUED,
        errorMessage: 'Held for quiet hours',
      },
    });
  }

  // ── User prefs ────────────────────────────────────────────────

  async listPrefs(userId: string) {
    return this.prisma.userNotificationPref.findMany({ where: { userId } });
  }

  async setPref(userId: string, eventType: string, channel: NotificationChannel, enabled: boolean) {
    return this.prisma.userNotificationPref.upsert({
      where: { userId_eventType_channel: { userId, eventType, channel } },
      update: { enabled },
      create: { userId, eventType, channel, enabled },
    });
  }

  // ── Cost report ───────────────────────────────────────────────

  async costReport(orgId: string, opts: { from?: Date; to?: Date } = {}) {
    const logs = await this.prisma.notificationLog.findMany({
      where: {
        orgId,
        ...(opts.from || opts.to
          ? { createdAt: { ...(opts.from && { gte: opts.from }), ...(opts.to && { lte: opts.to }) } }
          : {}),
      },
      select: { channel: true, costInPaise: true, status: true },
    });
    const byChannel: Record<string, { count: number; paise: number; failed: number }> = {};
    for (const l of logs) {
      const k = l.channel;
      byChannel[k] = byChannel[k] ?? { count: 0, paise: 0, failed: 0 };
      byChannel[k].count++;
      byChannel[k].paise += l.costInPaise ?? 0;
      if (l.status === NotificationDeliveryStatus.FAILED) byChannel[k].failed++;
    }
    return { byChannel, total: logs.length };
  }
}
