import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // In-memory read tracking for virtual role items (recruiter / candidate)
  private readonly readItemIds = new Set<string>();

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
    toEmail?: string;
  }) {
    let notification: any = null;

    // Finding F-12 fix: Check if userId is a valid User in the users table
    const user = await this.prisma.user
      .findUnique({
        where: { id: data.userId },
        select: { id: true, email: true },
      })
      .catch(() => null);

    if (user) {
      try {
        notification = await this.prisma.notification.create({
          data: {
            userId: user.id,
            orgId: data.orgId,
            type: data.type,
            title: data.title,
            body: data.body,
            entityType: data.entityType,
            entityId: data.entityId,
            actionUrl: data.actionUrl,
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to insert notification row: ${err.message}`);
      }

      const emailToSend = user.email || data.toEmail;
      if (emailToSend) {
        this.emailService
          .sendNotificationEmail(
            emailToSend,
            data.title,
            data.body,
            data.actionUrl,
          )
          .catch((err) => {
            this.logger.error(
              `Email dispatch failed for ${emailToSend}: ${err.message}`,
            );
          });
      }
    } else {
      this.logger.log(
        `Principal-agnostic event for ${data.userId}: [${data.type}] ${data.title}`,
      );
      if (data.toEmail) {
        this.emailService
          .sendNotificationEmail(
            data.toEmail,
            data.title,
            data.body,
            data.actionUrl,
          )
          .catch(() => null);
      }
    }

    return (
      notification || {
        id: `virtual-${Date.now()}`,
        read: false,
        createdAt: new Date(),
        ...data,
      }
    );
  }

  async findAll(
    user: any,
    opts: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, unreadOnly = false, type } = opts;
    const userType =
      user?.userType || (user?.orgId ? 'COMPANY_USER' : 'RECRUITER');

    // ── 1. Company User Notifications (from Database) ─────────
    if (userType === 'COMPANY_USER' || userType === 'COMPANY_ADMIN') {
      const where: any = { userId: user.id };
      if (user.orgId) where.orgId = user.orgId;
      if (unreadOnly) where.read = false;

      if (type && type !== 'ALL') {
        const cat = type.toUpperCase();
        if (cat === 'REFERRALS' || cat === 'REFERRAL') {
          where.OR = [
            { type: { contains: 'REFERRAL', mode: 'insensitive' } },
            { type: { contains: 'CONSENT', mode: 'insensitive' } },
            { entityType: 'REFERRAL' },
          ];
        } else if (cat === 'MANDATES' || cat === 'MANDATE') {
          where.OR = [
            { type: { contains: 'MANDATE', mode: 'insensitive' } },
            { entityType: 'MANDATE' },
          ];
        } else if (cat === 'REWARDS' || cat === 'REWARD') {
          where.OR = [
            { type: { contains: 'REWARD', mode: 'insensitive' } },
            { entityType: 'REWARD' },
          ];
        } else {
          where.type = { contains: type, mode: 'insensitive' };
        }
      }

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

    // ── 2. Recruiter Notifications (Live Marketplace Events) ──
    if (userType === 'RECRUITER') {
      const recruiterId = user.id;
      const items: NotificationItem[] = [];

      // Query recruiter's referrals with mandate & candidate profile
      const referrals = await this.prisma.referral.findMany({
        where: { recruiterId },
        include: {
          mandate: {
            select: {
              id: true,
              title: true,
              organization: { select: { name: true } },
            },
          },
          candidateProfile: { select: { name: true } },
          reward: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      });

      for (const ref of referrals) {
        const cName = ref.candidateProfile?.name || 'Candidate';
        const mTitle = ref.mandate?.title || 'Mandate';
        const orgName = ref.mandate?.organization?.name || 'Company';

        if (ref.status === 'ACTIVATED' || ref.status === 'CANDIDATE_ACCEPTED') {
          items.push({
            id: `ref-consent-${ref.id}`,
            type: 'REFERRAL',
            title: `Candidate Consented: ${cName}`,
            body: `${cName} accepted your referral invite for ${mTitle} at ${orgName}.`,
            read: this.readItemIds.has(`ref-consent-${ref.id}`),
            entityType: 'REFERRAL',
            entityId: ref.id,
            actionUrl: '/recruiter/referrals',
            createdAt: ref.activatedAt || ref.updatedAt,
          });
        } else if (ref.status === 'CANDIDATE_DECLINED') {
          items.push({
            id: `ref-decline-${ref.id}`,
            type: 'REFERRAL',
            title: `Consent Declined: ${cName}`,
            body: `${cName} declined the referral request for ${mTitle}.`,
            read: this.readItemIds.has(`ref-decline-${ref.id}`),
            entityType: 'REFERRAL',
            entityId: ref.id,
            actionUrl: '/recruiter/referrals',
            createdAt: ref.updatedAt,
          });
        }

        // Reward tracking events
        if (ref.reward) {
          const rStatus = ref.reward.status;
          const rAmount = ref.reward.rewardAmount
            ? Number(ref.reward.rewardAmount).toLocaleString('en-IN')
            : '0';
          if (
            rStatus === 'APPROVED' ||
            rStatus === 'ELIGIBLE' ||
            rStatus === 'PAID'
          ) {
            items.push({
              id: `rew-${ref.reward.id}`,
              type: 'REWARD',
              title: `Reward ${rStatus.replace('_', ' ')}: ₹${rAmount}`,
              body: `Reward for placing ${cName} on ${mTitle} is now ${rStatus}.`,
              read: this.readItemIds.has(`rew-${ref.reward.id}`),
              entityType: 'REWARD',
              entityId: ref.reward.id,
              actionUrl: '/recruiter/earnings',
              createdAt: ref.reward.updatedAt,
            });
          }
        }
      }

      // Claim scope expiring alerts
      const expiringScopes = await this.prisma.claimScope.findMany({
        where: {
          ownedByRecruiterId: recruiterId,
          ownershipExpiresAt: { gt: new Date() },
        },
        include: {
          referral: {
            include: {
              mandate: { select: { title: true } },
              candidateProfile: { select: { name: true } },
            },
          },
        },
        take: 10,
      });

      for (const scope of expiringScopes) {
        const hoursLeft = Math.round(
          (scope.ownershipExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60),
        );
        if (hoursLeft <= 12) {
          const cName = scope.referral?.candidateProfile?.name || 'Candidate';
          const mTitle = scope.referral?.mandate?.title || 'Mandate';
          items.push({
            id: `scope-exp-${scope.id}`,
            type: 'CLAIM',
            title: '48h Claim Scope Expiring',
            body: `Exclusivity lock on ${cName} for ${mTitle} expires in ${hoursLeft} hours.`,
            read: this.readItemIds.has(`scope-exp-${scope.id}`),
            entityType: 'CLAIM_SCOPE',
            entityId: scope.id,
            actionUrl: '/recruiter/referrals',
            createdAt: scope.createdAt,
          });
        }
      }

      // Sort, filter, and paginate
      let filtered = items.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (unreadOnly) filtered = filtered.filter((item) => !item.read);
      if (type && type !== 'ALL') {
        const cat = type.toUpperCase();
        if (cat === 'REFERRALS' || cat === 'REFERRAL') {
          filtered = filtered.filter(
            (i) => i.type === 'REFERRAL' || i.type === 'CLAIM',
          );
        } else if (cat === 'REWARDS' || cat === 'REWARD') {
          filtered = filtered.filter((i) => i.type === 'REWARD');
        }
      }

      const total = filtered.length;
      const data = filtered.slice((page - 1) * limit, page * limit);

      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // ── 3. Candidate Notifications (Live Consents & Applications) ──
    if (userType === 'CANDIDATE') {
      const candidateProfileId = user.id;
      const items: NotificationItem[] = [];

      const consents = await this.prisma.candidateConsent.findMany({
        where: { candidateProfileId },
        include: {
          referral: {
            include: {
              mandate: {
                select: {
                  title: true,
                  organization: { select: { name: true } },
                },
              },
              recruiter: { select: { name: true } },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      });

      for (const c of consents) {
        const recName = c.referral?.recruiter?.name || 'A recruiter';
        const mTitle = c.referral?.mandate?.title || 'Open Mandate';
        const orgName = c.referral?.mandate?.organization?.name || 'Company';

        if (c.status === 'PENDING') {
          items.push({
            id: `cand-consent-${c.id}`,
            type: 'CONSENT',
            title: `Referral Invitation: ${mTitle}`,
            body: `${recName} referred you to ${mTitle} at ${orgName}. Review details and consent.`,
            read: this.readItemIds.has(`cand-consent-${c.id}`),
            entityType: 'CONSENT',
            entityId: c.id,
            actionUrl: '/candidate/referrals',
            createdAt: c.requestedAt,
          });
        }
      }

      let filtered = items.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (unreadOnly) filtered = filtered.filter((item) => !item.read);
      const total = filtered.length;
      const data = filtered.slice((page - 1) * limit, page * limit);

      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  async getUnreadCount(user: any) {
    const res = await this.findAll(user, { unreadOnly: true, limit: 1 });
    return { unreadCount: res.meta.total };
  }

  async markAsRead(user: any, ids: string[]) {
    if (user?.orgId && user?.id) {
      await this.prisma.notification.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { read: true },
      });
    }
    for (const id of ids) {
      this.readItemIds.add(id);
    }
    return { success: true };
  }

  async markAllRead(user: any) {
    if (user?.orgId && user?.id) {
      await this.prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    }
    const unread = await this.findAll(user, { unreadOnly: true, limit: 100 });
    for (const item of unread.data) {
      this.readItemIds.add(item.id);
    }
    return { success: true };
  }
}
