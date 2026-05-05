import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ESignProvider, ESignStatus, OfferStatus } from '@prisma/client';
import { FileUploadService } from '../../file-upload/file-upload.service';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ESignService } from '../../../integrations/esign/esign.service';
import { OfferRenderService } from './offer-render.service';

const JOINING_AUTO_CREATE_QUEUE = 'joining.auto-create';

@Injectable()
export class OfferESignService {
  private readonly logger = new Logger(OfferESignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly esign: ESignService,
    private readonly render: OfferRenderService,
    private readonly fileUpload: FileUploadService,
    private readonly queue: JobQueueService,
  ) {}

  async initiate(orgId: string, offerId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, orgId },
      include: {
        application: { include: { candidate: true } },
        signatureRequest: true,
        docVersions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== OfferStatus.APPROVED && offer.status !== OfferStatus.SENT) {
      throw new BadRequestException('Offer must be APPROVED before requesting signature');
    }
    if (offer.signatureRequest && offer.signatureRequest.status === ESignStatus.SIGNED) {
      throw new BadRequestException('Already signed');
    }

    let s3Key = offer.docVersions[0]?.s3Key;
    if (!s3Key) {
      const r = await this.render.render(offerId);
      s3Key = r.s3Key;
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.fileUpload.getFileBuffer(s3Key);
    } catch (err) {
      this.logger.warn(`Could not fetch doc buffer (${err}); using placeholder`);
      pdfBuffer = Buffer.from(`Offer ${offerId}`, 'utf-8');
    }

    const provider = await this.esign.getProviderForOrg(orgId);
    const result = await provider.createSignRequest({
      pdfBuffer,
      fileName: `offer-${offerId}.pdf`,
      signers: [
        {
          name: offer.application.candidate.name,
          email: offer.application.candidate.email,
          phone: offer.application.candidate.phone ?? undefined,
        },
      ],
      expireInDays: 14,
    });

    const providerEnum: ESignProvider = provider.name === 'leegality' ? 'LEEGALITY' : 'DIGIO';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const upserted = await this.prisma.eSignRequest.upsert({
      where: { offerId },
      update: {
        provider: providerEnum,
        providerReqId: result.providerReqId,
        signerEmail: offer.application.candidate.email,
        signerPhone: offer.application.candidate.phone ?? undefined,
        status: ESignStatus.SENT,
        sentAt: new Date(),
        expiresAt,
      },
      create: {
        offerId,
        provider: providerEnum,
        providerReqId: result.providerReqId,
        signerEmail: offer.application.candidate.email,
        signerPhone: offer.application.candidate.phone ?? undefined,
        status: ESignStatus.SENT,
        sentAt: new Date(),
        expiresAt,
      },
    });

    await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.SENT,
        expiresAt: offer.expiresAt ?? expiresAt,
      },
    });

    return { eSignRequest: upserted, signUrl: result.signUrl };
  }

  async refreshStatus(offerId: string) {
    const req = await this.prisma.eSignRequest.findUnique({
      where: { offerId },
      include: { offer: true },
    });
    if (!req) throw new NotFoundException('No e-sign request for offer');
    const provider = this.esign.getProviderByName(req.provider);
    const status = await provider.getStatus(req.providerReqId);
    return this.applyStatus(req.id, status.status, status.signedAt, status.auditTrailUrl);
  }

  async applyStatus(
    requestId: string,
    status: ESignStatus | string,
    signedAt?: Date,
    auditTrailUrl?: string,
  ) {
    const req = await this.prisma.eSignRequest.findUnique({ where: { id: requestId } });
    if (!req) return null;

    const newStatus = (typeof status === 'string' ? status.toUpperCase() : status) as ESignStatus;
    const events = (req.webhookEvents as unknown as any[]) ?? [];
    events.push({ at: new Date().toISOString(), status: newStatus, auditTrailUrl });

    await this.prisma.eSignRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        signedAt: newStatus === ESignStatus.SIGNED ? signedAt ?? new Date() : req.signedAt,
        auditTrailUrl: auditTrailUrl ?? req.auditTrailUrl,
        webhookEvents: events as any,
        lastPolledAt: new Date(),
      },
    });

    if (newStatus === ESignStatus.SIGNED) {
      await this.prisma.offer.update({
        where: { id: req.offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          acceptedAt: signedAt ?? new Date(),
        },
      });
      try {
        await this.queue.enqueue(JOINING_AUTO_CREATE_QUEUE, { offerId: req.offerId });
      } catch (err) {
        this.logger.warn(`Failed to enqueue joining auto-create: ${err}`);
      }
    } else if (newStatus === ESignStatus.EXPIRED) {
      await this.prisma.offer.update({
        where: { id: req.offerId },
        data: { status: OfferStatus.EXPIRED },
      });
    }

    return this.prisma.eSignRequest.findUnique({ where: { id: requestId } });
  }
}
