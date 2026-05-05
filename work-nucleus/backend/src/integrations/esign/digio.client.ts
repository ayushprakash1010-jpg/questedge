import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  ESignCreateInput,
  ESignCreateResult,
  ESignStatusResult,
  IESignProvider,
} from './esign-provider.interface';

const DIGIO_BASE_URL_DEFAULT = 'https://ext-gateway.digio.in:444';

@Injectable()
export class DigioClient implements IESignProvider {
  readonly name = 'digio' as const;
  private readonly logger = new Logger(DigioClient.name);

  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookSecret: string;
  private readonly sandbox: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('DIGIO_BASE_URL', DIGIO_BASE_URL_DEFAULT);
    this.clientId = this.config.get<string>('DIGIO_CLIENT_ID', '');
    this.clientSecret = this.config.get<string>('DIGIO_CLIENT_SECRET', '');
    this.webhookSecret = this.config.get<string>('DIGIO_WEBHOOK_SECRET', 'dev-webhook-secret');
    this.sandbox = this.config.get<string>('DIGIO_SANDBOX', 'true') !== 'false';
  }

  private authHeader(): string {
    const token = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${token}`;
  }

  async createSignRequest(input: ESignCreateInput): Promise<ESignCreateResult> {
    if (this.sandbox && !this.clientId) {
      // Local dev fallback so the flow is testable end-to-end without sandbox creds
      const fakeId = `dev-digio-${Date.now()}`;
      this.logger.warn(`Digio sandbox stubbed (no clientId) — issuing fake reqId ${fakeId}`);
      return { providerReqId: fakeId, signUrl: `https://digio.example/sign/${fakeId}` };
    }

    const body = {
      file_name: input.fileName,
      file_data: input.pdfBuffer.toString('base64'),
      signers: input.signers.map((s, i) => ({
        identifier: s.email,
        name: s.name,
        sign_type: 'aadhaar',
        reason: 'Offer letter signature',
        signer_tag: `signer_${i + 1}`,
      })),
      expire_in_days: input.expireInDays ?? 14,
      send_sign_link: true,
      notify_signers: true,
    };

    const res = await fetch(`${this.baseUrl}/v2/client/document/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Digio createSignRequest failed: ${res.status} ${text}`);
    }
    const data: any = await res.json();
    return { providerReqId: data.id, signUrl: data.sign_url };
  }

  async getStatus(providerReqId: string): Promise<ESignStatusResult> {
    if (this.sandbox && providerReqId.startsWith('dev-digio-')) {
      return { status: 'PENDING' };
    }
    const res = await fetch(`${this.baseUrl}/v2/client/document/${providerReqId}`, {
      headers: { Authorization: this.authHeader() },
    });
    if (!res.ok) throw new Error(`Digio getStatus failed: ${res.status}`);
    const data: any = await res.json();
    return mapDigioStatus(data);
  }

  async downloadSigned(providerReqId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/v2/client/document/${providerReqId}/download`, {
      headers: { Authorization: this.authHeader() },
    });
    if (!res.ok) throw new Error(`Digio downloadSigned failed: ${res.status}`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): boolean {
    const sig = (headers['x-digio-signature'] || headers['X-Digio-Signature']) as string | undefined;
    if (!sig) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(body: unknown): { providerReqId: string; status: ESignStatusResult['status'] } | null {
    if (!body || typeof body !== 'object') return null;
    const b: any = body;
    const id = b.entity_id ?? b.document_id ?? b.id;
    const eventType = b.event ?? b.event_type ?? '';
    if (!id) return null;
    let status: ESignStatusResult['status'] = 'PENDING';
    switch (eventType) {
      case 'document.signed':
      case 'document.completed':
        status = 'SIGNED';
        break;
      case 'document.viewed':
        status = 'VIEWED';
        break;
      case 'document.sent':
        status = 'SENT';
        break;
      case 'document.expired':
        status = 'EXPIRED';
        break;
      case 'document.failed':
      case 'document.rejected':
        status = 'FAILED';
        break;
    }
    return { providerReqId: id, status };
  }
}

function mapDigioStatus(data: any): ESignStatusResult {
  const raw = (data?.agreement_status ?? data?.status ?? '').toString().toLowerCase();
  if (raw.includes('completed') || raw.includes('signed')) {
    return {
      status: 'SIGNED',
      signedAt: data?.completed_at ? new Date(data.completed_at) : new Date(),
      auditTrailUrl: data?.audit_trail_url,
    };
  }
  if (raw.includes('expired')) return { status: 'EXPIRED' };
  if (raw.includes('failed') || raw.includes('rejected')) return { status: 'FAILED' };
  if (raw.includes('viewed')) return { status: 'VIEWED' };
  if (raw.includes('sent') || raw.includes('initiated')) return { status: 'SENT' };
  return { status: 'PENDING' };
}
