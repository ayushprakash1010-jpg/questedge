import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ESignProvider, ESignStatus, OfferStatus } from '@prisma/client';
import { FileUploadService } from '../../file-upload/file-upload.service';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ESignService } from '../../../integrations/esign/esign.service';
import { BgvService } from '../../bgv/bgv.service';
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
    private readonly bgvService: BgvService,
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
    if (
      offer.status !== OfferStatus.APPROVED &&
      offer.status !== OfferStatus.SENT
    ) {
      throw new BadRequestException(
        'Offer must be APPROVED before requesting signature',
      );
    }
    if (
      offer.signatureRequest &&
      offer.signatureRequest.status === ESignStatus.SIGNED
    ) {
      throw new BadRequestException('Already signed');
    }

    let s3Key = offer.docVersions[0]?.s3Key;
    if (!s3Key) {
      const r = await this.render.render(offerId);
      s3Key = r.s3Key;
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.render.getBuffer(s3Key);
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Rendered offer document could not be fetched from storage for e-sign dispatch',
        );
      }
      this.logger.warn(
        `Could not fetch doc buffer (${err}); using dev placeholder`,
      );
      pdfBuffer = Buffer.from(`Offer ${offerId}`, 'utf-8');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const provider = await this.esign.getProviderForOrg(orgId);
    let result: Awaited<ReturnType<typeof provider.createSignRequest>>;
    try {
      result = await provider.createSignRequest({
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
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      const isUnconfigured =
        msg.includes('not configured') || msg.includes('not yet implemented');
      if (!isUnconfigured) {
        throw err;
      }

      this.logger.warn(
        `External e-sign unavailable (${err.message}); dispatching offer ${offerId} via QuestEdge Candidate Portal`,
      );
      await this.prisma.offer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.SENT,
          expiresAt: offer.expiresAt ?? expiresAt,
        },
      });
      return {
        mode: 'PORTAL',
        eSignRequest: null,
        signUrl: offer.candidateToken ? `/offer/${offer.candidateToken}` : null,
        message: 'Offer sent via QuestEdge Candidate Portal',
      };
    }

    const providerEnum: ESignProvider =
      provider.name === 'leegality' ? 'LEEGALITY' : 'DIGIO';

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

    return {
      mode: providerEnum,
      eSignRequest: upserted,
      signUrl: result.signUrl,
      message: 'Offer sent via e-sign',
    };
  }

  async acceptViaPortal(token: string, signerName: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { candidateToken: token },
      include: { application: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    if (
      offer.status !== OfferStatus.SENT &&
      offer.status !== OfferStatus.VIEWED
    ) {
      throw new BadRequestException(
        `Offer cannot be accepted in status ${offer.status}`,
      );
    }

    const acceptedAt = new Date();
    const log = (offer.negotiationLog as unknown as any[]) ?? [];
    log.push({
      type: 'ACCEPT_PORTAL',
      signerName: signerName.trim(),
      at: acceptedAt.toISOString(),
    });

    const updated = await this.finalizeAcceptedOffer(
      {
        id: offer.id,
        orgId: offer.orgId,
        application: { candidateId: offer.application.candidateId },
      },
      acceptedAt,
      log,
    );
    return updated;
  }

  private async finalizeAcceptedOffer(
    offer: {
      id: string;
      orgId: string;
      application: { candidateId: string };
    },
    acceptedAt: Date,
    negotiationLog?: any[],
  ) {
    const updated = await this.prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: OfferStatus.ACCEPTED,
        acceptedAt,
        ...(negotiationLog ? { negotiationLog: negotiationLog as any } : {}),
      },
    });

    try {
      await this.queue.enqueue(JOINING_AUTO_CREATE_QUEUE, {
        offerId: offer.id,
      });
    } catch (err) {
      this.logger.warn(`Failed to enqueue joining auto-create: ${err}`);
    }

    // Auto-trigger BGV if configured
    try {
      const orgSettings = await this.prisma.orgSettings.findUnique({
        where: { orgId: offer.orgId },
      });
      const settings = (orgSettings?.settings as Record<string, any>) || {};
      if (settings.autoTriggerBgvOnOfferAccept) {
        await this.bgvService.initiate(offer.orgId, {
          candidateId: offer.application.candidateId,
          offerId: offer.id,
          checkTypes: [
            'PAN',
            'AADHAAR',
            'EMPLOYMENT_HISTORY',
            'EDUCATION',
          ] as any[],
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to auto-trigger BGV: ${err}`);
    }

    return updated;
  }

  async refreshStatus(offerId: string) {
    const req = await this.prisma.eSignRequest.findUnique({
      where: { offerId },
      include: { offer: true },
    });
    if (!req) throw new NotFoundException('No e-sign request for offer');
    const provider = this.esign.getProviderByName(req.provider);
    const status = await provider.getStatus(req.providerReqId);
    return this.applyStatus(
      req.id,
      status.status,
      status.signedAt,
      status.auditTrailUrl,
    );
  }

  async applyStatus(
    requestId: string,
    status: ESignStatus | string,
    signedAt?: Date,
    auditTrailUrl?: string,
  ) {
    const req = await this.prisma.eSignRequest.findUnique({
      where: { id: requestId },
      include: { offer: { include: { application: true } } },
    });
    if (!req) return null;

    const newStatus = (
      typeof status === 'string' ? status.toUpperCase() : status
    ) as ESignStatus;
    const events = (req.webhookEvents as unknown as any[]) ?? [];
    events.push({
      at: new Date().toISOString(),
      status: newStatus,
      auditTrailUrl,
    });

    await this.prisma.eSignRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        signedAt:
          newStatus === ESignStatus.SIGNED
            ? (signedAt ?? new Date())
            : req.signedAt,
        auditTrailUrl: auditTrailUrl ?? req.auditTrailUrl,
        webhookEvents: events as any,
        lastPolledAt: new Date(),
      },
    });

    if (newStatus === ESignStatus.SIGNED) {
      await this.finalizeAcceptedOffer(req.offer, signedAt ?? new Date());
    } else if (newStatus === ESignStatus.EXPIRED) {
      await this.prisma.offer.update({
        where: { id: req.offerId },
        data: { status: OfferStatus.EXPIRED },
      });
    }

    return this.prisma.eSignRequest.findUnique({ where: { id: requestId } });
  }
}
