import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface SmsRequest {
  /** DLT-registered template id (regulatory requirement in India). */
  templateId: string;
  to: string;
  variables: Record<string, string>;
}

export interface WhatsAppRequest {
  templateName: string;
  to: string;
  variables: string[];
  language?: string;
}

export interface MessageResult {
  providerId: string;
  costInPaise?: number;
}

const DEFAULT_BASE = 'https://control.msg91.com/api/v5';

@Injectable()
export class Msg91Client {
  private readonly logger = new Logger(Msg91Client.name);
  private readonly baseUrl: string;
  private readonly authKey: string;
  private readonly senderId: string;
  private readonly waChannelNumber: string;
  private readonly webhookSecret: string;
  private readonly sandbox: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('MSG91_BASE_URL', DEFAULT_BASE);
    this.authKey = this.config.get<string>('MSG91_AUTH_KEY', '');
    this.senderId = this.config.get<string>('MSG91_SMS_SENDER_ID', 'WRKNCS');
    this.waChannelNumber = this.config.get<string>('MSG91_WA_NUMBER', '');
    this.webhookSecret = this.config.get<string>('MSG91_WEBHOOK_SECRET', 'dev-msg91-secret');
    this.sandbox = this.config.get<string>('MSG91_SANDBOX', 'true') !== 'false';
  }

  async sendSms(req: SmsRequest): Promise<MessageResult> {
    if (this.sandbox && !this.authKey) {
      const id = `dev-msg91-sms-${Date.now()}`;
      this.logger.warn(`[MSG91 sandbox] SMS to=${redactPhone(req.to)} template=${req.templateId} → ${id}`);
      return { providerId: id, costInPaise: 25 };
    }
    const res = await fetch(`${this.baseUrl}/flow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authkey: this.authKey,
      },
      body: JSON.stringify({
        template_id: req.templateId,
        sender: this.senderId,
        short_url: '0',
        recipients: [{ mobiles: req.to, ...req.variables }],
      }),
    });
    if (!res.ok) {
      throw new Error(`MSG91 SMS failed: ${res.status} ${await res.text()}`);
    }
    const data: any = await res.json();
    return { providerId: data.request_id ?? data.message ?? 'unknown', costInPaise: 25 };
  }

  async sendWhatsApp(req: WhatsAppRequest): Promise<MessageResult> {
    if (this.sandbox && !this.authKey) {
      const id = `dev-msg91-wa-${Date.now()}`;
      this.logger.warn(`[MSG91 sandbox] WhatsApp to=${redactPhone(req.to)} template=${req.templateName} → ${id}`);
      return { providerId: id, costInPaise: 60 };
    }
    if (!this.waChannelNumber) throw new Error('MSG91_WA_NUMBER not configured');
    const res = await fetch(`${this.baseUrl}/whatsapp/whatsapp-outbound-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authkey: this.authKey },
      body: JSON.stringify({
        integrated_number: this.waChannelNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          to: req.to,
          type: 'template',
          template: {
            name: req.templateName,
            language: { code: req.language ?? 'en', policy: 'deterministic' },
            components: [
              {
                type: 'body',
                parameters: req.variables.map((v) => ({ type: 'text', text: v })),
              },
            ],
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`MSG91 WhatsApp failed: ${res.status} ${await res.text()}`);
    const data: any = await res.json();
    return { providerId: data.request_id ?? data.id ?? 'unknown', costInPaise: 60 };
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): boolean {
    const sig = (headers['x-msg91-signature'] || headers['X-MSG91-Signature']) as string | undefined;
    if (!sig) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  parseDeliveryReceipt(body: any): { providerId: string; status: 'DELIVERED' | 'FAILED' | 'BOUNCED' } | null {
    if (!body || typeof body !== 'object') return null;
    const id = body.request_id ?? body.id ?? body.message_id;
    const status = (body.status ?? body.event ?? '').toString().toLowerCase();
    if (!id) return null;
    if (status.includes('deliver')) return { providerId: id, status: 'DELIVERED' };
    if (status.includes('bounce')) return { providerId: id, status: 'BOUNCED' };
    if (status.includes('fail') || status.includes('reject')) return { providerId: id, status: 'FAILED' };
    return null;
  }
}

function redactPhone(p: string): string {
  if (p.length < 4) return '***';
  return `${p.slice(0, 2)}****${p.slice(-2)}`;
}
