import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { BgvCheckType } from '@prisma/client';
import {
  BgvCandidatePayload,
  BgvWebhookEvent,
  IBgvProvider,
  VendorCheckStatus,
} from './bgv-provider.interface';

const DEFAULT_BASE = 'https://api.authbridge.com';

const PII_FIELDS = new Set(['pan', 'aadhaar', 'aadhaar_number', 'pan_number', 'dob']);

function redactPii(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(redactPii);
  if (typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [
        k,
        PII_FIELDS.has(k.toLowerCase()) ? '***REDACTED***' : redactPii(v),
      ]),
    );
  }
  return input;
}

@Injectable()
export class AuthBridgeProvider implements IBgvProvider {
  readonly name = 'authbridge' as const;
  private readonly logger = new Logger(AuthBridgeProvider.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly sandbox: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('AUTHBRIDGE_BASE_URL', DEFAULT_BASE);
    this.apiKey = this.config.get<string>('AUTHBRIDGE_API_KEY', '');
    this.webhookSecret = this.config.get<string>('AUTHBRIDGE_WEBHOOK_SECRET', 'dev-webhook-secret');
    this.sandbox = this.config.get<string>('AUTHBRIDGE_SANDBOX', 'true') !== 'false';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const backoff = Math.min(2 ** i * 500, 4000);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw lastErr;
  }

  async initiateProfile(input: { candidate: BgvCandidatePayload; orgRefId: string }): Promise<{ vendorRefId: string }> {
    if (this.sandbox && !this.apiKey) {
      const fake = `dev-ab-${Date.now()}`;
      this.logger.warn(`AuthBridge sandbox stubbed (no API key) — issuing fake profile ${fake}`);
      return { vendorRefId: fake };
    }
    return this.withRetry(async () => {
      const res = await fetch(`${this.baseUrl}/v1/profiles`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: input.candidate.fullName,
          email: input.candidate.email,
          phone: input.candidate.phone,
          dob: input.candidate.dob,
          client_ref: input.orgRefId,
        }),
      });
      if (!res.ok) throw new Error(`AuthBridge initiateProfile ${res.status}: ${await res.text()}`);
      const data: any = await res.json();
      return { vendorRefId: data.profile_id ?? data.id };
    });
  }

  async submitCheck(input: {
    vendorProfileRefId: string;
    type: BgvCheckType;
    payload: Record<string, unknown>;
  }): Promise<{ vendorCheckRefId: string }> {
    if (this.sandbox && input.vendorProfileRefId.startsWith('dev-ab-')) {
      const fake = `dev-ab-chk-${Date.now()}`;
      this.logger.debug(`Sandbox: queuing fake check ${fake} (type=${input.type})`);
      return { vendorCheckRefId: fake };
    }
    return this.withRetry(async () => {
      const res = await fetch(`${this.baseUrl}/v1/profiles/${input.vendorProfileRefId}/checks`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          type: mapCheckType(input.type),
          input: input.payload,
        }),
      });
      if (!res.ok) {
        this.logger.error(
          `AuthBridge submitCheck failed (type=${input.type}, payload=${JSON.stringify(redactPii(input.payload))})`,
        );
        throw new Error(`AuthBridge submitCheck ${res.status}: ${await res.text()}`);
      }
      const data: any = await res.json();
      return { vendorCheckRefId: data.check_id ?? data.id };
    });
  }

  async getCheckStatus(vendorCheckRefId: string): Promise<VendorCheckStatus> {
    if (this.sandbox && vendorCheckRefId.startsWith('dev-ab-chk-')) {
      return { status: 'IN_PROGRESS', finding: 'PENDING' };
    }
    const res = await fetch(`${this.baseUrl}/v1/checks/${vendorCheckRefId}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`AuthBridge getCheckStatus ${res.status}`);
    const data: any = await res.json();
    return mapStatusResponse(data);
  }

  async downloadReport(vendorCheckRefId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/v1/checks/${vendorCheckRefId}/report`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`AuthBridge downloadReport ${res.status}`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): boolean {
    const sig = (headers['x-authbridge-signature'] || headers['X-AuthBridge-Signature']) as string | undefined;
    if (!sig) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(body: unknown): BgvWebhookEvent | null {
    if (!body || typeof body !== 'object') return null;
    const b: any = body;
    const id = b.check_id ?? b.id;
    if (!id) return null;
    const status = mapStatusResponse(b);
    return {
      vendorCheckRefId: id,
      status: status.status,
      finding: status.finding,
      reportUrl: status.reportUrl,
    };
  }
}

function mapCheckType(t: BgvCheckType): string {
  const map: Record<BgvCheckType, string> = {
    PAN: 'pan',
    AADHAAR: 'aadhaar',
    PASSPORT: 'passport',
    EDUCATION: 'education',
    EMPLOYMENT_HISTORY: 'employment',
    ADDRESS_CURRENT: 'address_current',
    ADDRESS_PERMANENT: 'address_permanent',
    CRIMINAL_COURT: 'criminal_court',
    POLICE_VERIFICATION: 'police',
    CREDIT_CHECK: 'credit',
    GLOBAL_DATABASE: 'global_db',
    DRUG_TEST: 'drug',
    REFERENCE: 'reference',
  };
  return map[t];
}

function mapStatusResponse(data: any): VendorCheckStatus {
  const raw = (data?.status ?? data?.state ?? '').toString().toLowerCase();
  let status: VendorCheckStatus['status'] = 'IN_PROGRESS';
  if (raw.includes('queued')) status = 'QUEUED';
  else if (raw.includes('progress') || raw.includes('processing')) status = 'IN_PROGRESS';
  else if (raw.includes('complete') || raw.includes('done')) status = 'COMPLETED';
  else if (raw.includes('fail')) status = 'FAILED';
  else if (raw.includes('cancel')) status = 'CANCELLED';

  const findingRaw = (data?.finding ?? data?.outcome ?? '').toString().toLowerCase();
  let finding: VendorCheckStatus['finding'] = 'PENDING';
  if (findingRaw === 'clear' || findingRaw === 'verified' || findingRaw === 'pass') finding = 'CLEAR';
  else if (findingRaw === 'discrepancy' || findingRaw === 'mismatch') finding = 'DISCREPANCY';
  else if (findingRaw === 'unable' || findingRaw === 'inconclusive') finding = 'UNABLE_TO_VERIFY';

  return {
    status,
    finding,
    reportUrl: data?.report_url,
    rawResponse: data,
    failureReason: data?.failure_reason ?? data?.error,
    costInPaise: typeof data?.cost_paise === 'number' ? data.cost_paise : undefined,
  };
}
