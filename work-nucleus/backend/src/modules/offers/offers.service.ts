import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CompensationService } from '../compensation/compensation.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferApprovalService } from './services/offer-approval.service';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compensation: CompensationService,
    private readonly approval: OfferApprovalService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateOfferDto) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: { id: dto.applicationId, hiringPlan: { orgId } },
      include: { offer: true, decision: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.offer) throw new BadRequestException('Offer already exists for this application');
    if (!application.decision || application.decision.decision !== 'SELECTED') {
      throw new BadRequestException('Cannot create offer: application is not in SELECTED state');
    }

    const template = await this.prisma.offerTemplate.findFirst({
      where: { id: dto.templateId, orgId, isActive: true },
    });
    if (!template) throw new NotFoundException('Active offer template not found');

    let compensationId = dto.compensationId;
    if (!compensationId && dto.compensation) {
      const c = await this.compensation.create(orgId, dto.compensation);
      compensationId = c.id;
    }

    const chain = await this.approval.buildChain(orgId, dto.approverChain);
    const candidateToken = randomBytes(24).toString('hex');

    return this.prisma.offer.create({
      data: {
        orgId,
        applicationId: dto.applicationId,
        templateId: dto.templateId,
        compensationId,
        status: OfferStatus.DRAFT,
        approvalChain: chain as any,
        candidateToken,
        expiresAt: dto.expiresAt,
        createdById: userId,
      },
      include: {
        template: { select: { id: true, name: true, version: true } },
        compensation: true,
        application: { include: { candidate: { select: { id: true, name: true, email: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, orgId },
      include: {
        template: true,
        compensation: true,
        application: {
          include: {
            candidate: true,
            hiringPlan: { select: { id: true, title: true, designation: true, department: true } },
          },
        },
        signatureRequest: true,
        docVersions: { orderBy: { version: 'desc' } },
        createdBy: { select: { id: true, name: true, email: true } },
        joining: true,
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async findByToken(token: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { candidateToken: token },
      include: {
        organization: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, brandingJson: true } },
        compensation: true,
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            hiringPlan: { select: { id: true, title: true, designation: true, department: true } },
          },
        },
        signatureRequest: { select: { status: true, sentAt: true, signedAt: true } },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async list(orgId: string, opts: { status?: string; page?: number; limit?: number } = {}) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const where: any = { orgId };
    if (opts.status) where.status = opts.status;
    const [data, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        include: {
          application: { include: { candidate: { select: { id: true, name: true, email: true } } } },
          template: { select: { id: true, name: true } },
          compensation: { select: { fixedAnnual: true, currency: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.offer.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async revoke(orgId: string, id: string) {
    const offer = await this.findOne(orgId, id);
    if (offer.status === OfferStatus.ACCEPTED) {
      throw new BadRequestException('Accepted offers cannot be revoked through this path');
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: OfferStatus.REVOKED },
    });
  }

  async markViewed(token: string) {
    const offer = await this.prisma.offer.findFirst({ where: { candidateToken: token } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.firstViewedAt) return offer;
    return this.prisma.offer.update({
      where: { id: offer.id },
      data: {
        firstViewedAt: new Date(),
        status: offer.status === OfferStatus.SENT ? OfferStatus.VIEWED : offer.status,
      },
    });
  }

  async candidateDecline(token: string, reason: string, comment?: string) {
    const offer = await this.prisma.offer.findFirst({ where: { candidateToken: token } });
    if (!offer) throw new NotFoundException('Offer not found');
    const closed: OfferStatus[] = [OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.REVOKED];
    if (closed.includes(offer.status)) {
      throw new BadRequestException(`Offer is already ${offer.status}`);
    }
    return this.prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: OfferStatus.DECLINED,
        declinedAt: new Date(),
        declineReason: reason,
        negotiationLog: [
          ...((offer.negotiationLog as unknown as any[]) ?? []),
          { type: 'DECLINE', reason, comment, at: new Date().toISOString() },
        ] as any,
      },
    });
  }

  async candidateNegotiate(token: string, comment: string, counter?: Record<string, unknown>) {
    const offer = await this.prisma.offer.findFirst({ where: { candidateToken: token } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== OfferStatus.SENT && offer.status !== OfferStatus.VIEWED) {
      throw new BadRequestException('Offer is not in a state that accepts negotiation');
    }
    const log = (offer.negotiationLog as unknown as any[]) ?? [];
    log.push({ type: 'NEGOTIATE', comment, counter, at: new Date().toISOString() });
    return this.prisma.offer.update({
      where: { id: offer.id },
      data: { negotiationLog: log as any },
    });
  }
}
