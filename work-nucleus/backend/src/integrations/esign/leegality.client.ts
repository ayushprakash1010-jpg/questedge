import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ESignCreateInput,
  ESignCreateResult,
  ESignStatusResult,
  IESignProvider,
} from './esign-provider.interface';

/**
 * Leegality stub — interface preserved so OrgSettings.eSignProvider can route
 * here without code changes once the integration is built. Sandbox returns
 * deterministic fake ids for parity with DigioClient's dev fallback.
 */
@Injectable()
export class LeegalityClient implements IESignProvider {
  readonly name = 'leegality' as const;
  private readonly logger = new Logger(LeegalityClient.name);

  constructor(private readonly config: ConfigService) {}

  async createSignRequest(input: ESignCreateInput): Promise<ESignCreateResult> {
    this.logger.warn('Leegality not yet implemented — returning dev fake id');
    return {
      providerReqId: `dev-leegality-${Date.now()}`,
      signUrl: 'https://leegality.example/sign/stub',
    };
  }

  async getStatus(providerReqId: string): Promise<ESignStatusResult> {
    if (providerReqId.startsWith('dev-leegality-')) return { status: 'PENDING' };
    throw new NotImplementedException('Leegality.getStatus not yet implemented');
  }

  async downloadSigned(_providerReqId: string): Promise<Buffer> {
    throw new NotImplementedException('Leegality.downloadSigned not yet implemented');
  }

  verifyWebhook(_headers: Record<string, string | string[] | undefined>, _rawBody: Buffer): boolean {
    return false;
  }

  parseWebhookEvent(_body: unknown) {
    return null;
  }
}
