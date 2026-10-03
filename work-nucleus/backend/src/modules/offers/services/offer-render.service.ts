import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildOfferHtml, renderTemplate } from './template-renderer';

/**
 * Renders an offer letter into a versioned S3 artefact. Currently writes HTML;
 * swap-in a puppeteer-based PDF print is gated on chromium availability in the
 * build image (see infra/docker — TODO: add @sparticuz/chromium layer).
 */
@Injectable()
export class OfferRenderService {
  private readonly logger = new Logger(OfferRenderService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('S3_OFFERS_BUCKET', 'questedge-offers');
    this.s3 = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000'),
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
    });
  }

  async render(offerId: string): Promise<{ s3Key: string; pdfUrl: string; version: number }> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        organization: true,
        template: true,
        compensation: true,
        application: {
          include: {
            candidate: true,
            hiringPlan: { select: { title: true, designation: true, department: true } },
          },
        },
        docVersions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    const ctx: Record<string, unknown> = {
      candidate: {
        name: offer.application.candidate.name,
        email: offer.application.candidate.email,
      },
      role: {
        title: offer.application.hiringPlan.designation,
        department: offer.application.hiringPlan.department,
      },
      org: { name: offer.organization.name },
      offer: {
        expiresAt: offer.expiresAt?.toISOString().slice(0, 10) ?? '',
      },
      compensation: offer.compensation
        ? {
            currency: offer.compensation.currency,
            fixedAnnual: offer.compensation.fixedAnnual.toString(),
            variableAnnual: offer.compensation.variableAnnual.toString(),
            joiningBonus: offer.compensation.joiningBonus.toString(),
            retentionBonus: offer.compensation.retentionBonus.toString(),
          }
        : null,
    };

    const bodyHtml = renderTemplate(offer.template.body, ctx);
    const html = buildOfferHtml({
      bodyHtml,
      branding: (offer.template.brandingJson as any) ?? {},
      candidateName: offer.application.candidate.name,
      orgName: offer.organization.name,
    });

    const nextVersion = (offer.docVersions[0]?.version ?? 0) + 1;
    const ext = 'html'; // becomes 'pdf' once puppeteer is wired
    const key = `offers/${offer.orgId}/${offer.id}/v${nextVersion}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(html, 'utf-8'),
        ContentType: 'text/html; charset=utf-8',
      }),
    );

    await this.prisma.$transaction([
      this.prisma.offerDocVersion.create({
        data: { offerId: offer.id, version: nextVersion, s3Key: key },
      }),
      this.prisma.offer.update({
        where: { id: offer.id },
        data: { generatedDocUrl: key },
      }),
    ]);

    const pdfUrl = await this.signedUrl(key);
    this.logger.log(`Rendered offer ${offer.id} v${nextVersion} → ${key}`);
    return { s3Key: key, pdfUrl, version: nextVersion };
  }

  async signedUrl(s3Key: string, ttlSeconds = 86400): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    return getSignedUrl(this.s3, cmd, { expiresIn: ttlSeconds });
  }
}
