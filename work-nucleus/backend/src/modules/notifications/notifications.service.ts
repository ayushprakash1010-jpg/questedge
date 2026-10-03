import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(data: {
    userId: string;
    orgId: string;
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  }) {
    const notification = await this.prisma.notification.create({ data });

    try {
      const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
      if (user?.email) {
        // Fire and forget email dispatch
        this.emailService.sendNotificationEmail(
          user.email,
          data.title,
          data.body,
          data.actionUrl,
        ).catch(err => {
          this.logger.error(`Email dispatch failed for ${user.email}: ${err.message}`);
        });
      }
    } catch (err) {
      this.logger.error(`Failed to send email notification: ${err.message}`);
    }

    return notification;
  }

  async findAll(
    userId: string,
    opts: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = opts;
    const where: any = { userId };
    if (unreadOnly) where.read = false;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(userId: string, ids: string[]) {
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
