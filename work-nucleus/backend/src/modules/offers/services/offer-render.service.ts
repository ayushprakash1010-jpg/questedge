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
    this.bucket =
      this.config.get<string>('S3_OFFERS_BUCKET') ||
      this.config.get<string>('S3_BUCKET') ||
      this.config.get<string>('AWS_BUCKET_NAME') ||
      'questedge-offers';

    const accessKeyId =
      this.config.get<string>('S3_ACCESS_KEY') ||
      this.config.get<string>('S3_ACCESS_KEY_ID') ||
      this.config.get<string>('AWS_ACCESS_KEY_ID') ||
      'minioadmin';

    const secretAccessKey =
      this.config.get<string>('S3_SECRET_KEY') ||
      this.config.get<string>('S3_SECRET_ACCESS_KEY') ||
      this.config.get<string>('AWS_SECRET_ACCESS_KEY') ||
      'minioadmin';

    const region =
      this.config.get<string>('S3_REGION') ||
      this.config.get<string>('AWS_REGION') ||
      'us-east-1';

    const customEndpoint = this.config.get<string>('S3_ENDPOINT');
    const isAwsConfig = Boolean(
      this.config.get<string>('AWS_REGION') ||
        this.config.get<string>('AWS_ACCESS_KEY_ID'),
    );

    const s3Config: any = {
      region,
      credentials: { accessKeyId, secretAccessKey },
    };
    if (customEndpoint) {
      s3Config.endpoint = customEndpoint;
      s3Config.forcePathStyle = true;
    } else if (!isAwsConfig) {
      s3Config.endpoint = 'http://localhost:9000';
      s3Config.forcePathStyle = true;
    }

    this.s3 = new S3Client(s3Config);
  }

  async render(
    offerId: string,
    customBody?: string,
  ): Promise<{ s3Key: string; pdfUrl: string; version: number }> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        organization: true,
        template: true,
        compensation: true,
        application: {
          include: {
            candidate: true,
            hiringPlan: {
              select: { title: true, designation: true, department: true },
            },
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
        body: customBody?.trim() ?? '',
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

    const templateHasCustomSlot = /\{\{\s*offer\.body\s*\}\}/.test(
      offer.template.body,
    );
    let bodyHtml = renderTemplate(offer.template.body, ctx);
    if (customBody?.trim() && !templateHasCustomSlot) {
      const renderedCustom = renderTemplate(
        customBody
          .trim()
          .split(/\n{2,}/)
          .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
          .join(''),
        ctx,
      );
      const compHtml = offer.compensation
        ? `<p><strong>Fixed Annual:</strong> ${offer.compensation.currency} ${offer.compensation.fixedAnnual.toString()} | <strong>Variable:</strong> ${offer.compensation.currency} ${offer.compensation.variableAnnual.toString()}</p>`
        : '';
      bodyHtml = `${renderedCustom}${compHtml}`;
    }
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

  async uploadHtml(s3Key: string, html: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: Buffer.from(html, 'utf-8'),
        ContentType: 'text/html; charset=utf-8',
      }),
    );
    return this.signedUrl(s3Key);
  }

  async getBuffer(s3Key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
    );
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
