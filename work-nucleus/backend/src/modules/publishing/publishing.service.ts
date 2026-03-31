import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishChannel, JdStatus, HiringPlanStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class PublishingService {
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
  }

  async publish(orgId: string, planId: string, channel: PublishChannel) {
    const plan = await this.prisma.hiringPlan.findFirst({
      where: { id: planId, orgId },
      include: {
        jobDescriptions: {
          where: { status: { in: [JdStatus.APPROVED, JdStatus.PUBLISHED] } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!plan) throw new NotFoundException('Hiring plan not found');
    const jd = plan.jobDescriptions[0];
    if (!jd) {
      throw new BadRequestException(
        'No approved job description found. Approve the JD before publishing.',
      );
    }

    // Check if already published on this channel
    const existing = await this.prisma.jobPublishing.findFirst({
      where: {
        hiringPlanId: planId,
        channel,
        status: 'PUBLISHED',
      },
    });
    if (existing) {
      return {
        publishing: existing,
        publicUrl: `${this.frontendUrl}/jobs/${existing.publicSlug}`,
      };
    }

    const publicSlug = randomBytes(6).toString('hex'); // 12-char hex string

    const publishing = await this.prisma.jobPublishing.create({
      data: {
        jobDescriptionId: jd.id,
        hiringPlanId: planId,
        orgId,
        channel,
        status: 'PUBLISHED',
        publicSlug,
        publishedAt: new Date(),
      },
    });

    // Update JD status to PUBLISHED
    if (jd.status !== JdStatus.PUBLISHED) {
      await this.prisma.jobDescription.update({
        where: { id: jd.id },
        data: { status: JdStatus.PUBLISHED },
      });
    }

    // Auto-activate hiring plan if still in DRAFT
    if (plan.status === HiringPlanStatus.DRAFT) {
      await this.prisma.hiringPlan.update({
        where: { id: planId },
        data: { status: HiringPlanStatus.ACTIVE },
      });
    }

    return {
      publishing,
      publicUrl: `${this.frontendUrl}/jobs/${publicSlug}`,
    };
  }

  async findByPlan(orgId: string, planId: string) {
    const publishings = await this.prisma.jobPublishing.findMany({
      where: { hiringPlanId: planId, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return publishings.map((p) => ({
      ...p,
      publicUrl: `${this.frontendUrl}/jobs/${p.publicSlug}`,
    }));
  }

  async unpublish(orgId: string, publishingId: string) {
    const publishing = await this.prisma.jobPublishing.findFirst({
      where: { id: publishingId, orgId },
    });
    if (!publishing) throw new NotFoundException('Publishing not found');

    return this.prisma.jobPublishing.update({
      where: { id: publishingId },
      data: { status: 'REMOVED' },
    });
  }
}
