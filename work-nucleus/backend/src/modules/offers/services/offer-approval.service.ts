import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ApprovalStep {
  role: string;
  userId?: string;
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  actedAt?: string;
  comment?: string;
  actorUserId?: string;
}

const DEFAULT_CHAIN: string[] = ['HIRING_MANAGER', 'HR', 'FINANCE', 'FOUNDER'];

@Injectable()
export class OfferApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async buildChain(orgId: string, override?: Array<{ role: string; userId?: string }>): Promise<ApprovalStep[]> {
    if (override?.length) {
      return override.map((o) => ({ role: o.role, userId: o.userId, status: 'PENDING' }));
    }
    const settings = await this.prisma.orgSettings.findUnique({ where: { orgId } });
    const orgChain = (settings?.settings as any)?.offerApprovalChain as string[] | undefined;
    const chain = orgChain?.length ? orgChain : DEFAULT_CHAIN;
    return chain.map((role) => ({ role, status: 'PENDING' }));
  }

  async submitForApproval(orgId: string, offerId: string, override?: ApprovalStep[]) {
    const offer = await this.prisma.offer.findFirst({ where: { id: offerId, orgId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== OfferStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT offers can be submitted for approval');
    }
    const chain = override ?? (await this.buildChain(orgId));
    return this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.PENDING_APPROVAL,
        approvalChain: chain as any,
      },
    });
  }

  async act(orgId: string, offerId: string, actorUserId: string, decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED', comment?: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id: offerId, orgId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== OfferStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Offer is not awaiting approval');
    }

    const chain = (offer.approvalChain as unknown as ApprovalStep[]) ?? [];
    const idx = chain.findIndex((s) => s.status === 'PENDING');
    if (idx < 0) throw new BadRequestException('No pending approval steps remain');

    const step = chain[idx];
    if (step.userId && step.userId !== actorUserId) {
      throw new BadRequestException('You are not the assigned approver for this step');
    }

    chain[idx] = {
      ...step,
      status: decision,
      actorUserId,
      actedAt: new Date().toISOString(),
      comment,
    };

    let newStatus: OfferStatus = OfferStatus.PENDING_APPROVAL;
    if (decision === 'REJECTED') newStatus = OfferStatus.REVOKED;
    else if (decision === 'CHANGES_REQUESTED') newStatus = OfferStatus.DRAFT;
    else if (decision === 'APPROVED') {
      const allDone = chain.every((s) => s.status === 'APPROVED');
      if (allDone) newStatus = OfferStatus.APPROVED;
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: newStatus,
        approvalChain: chain as any,
      },
    });
  }
}
