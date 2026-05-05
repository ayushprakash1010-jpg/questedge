import { Injectable, NotImplementedException } from '@nestjs/common';
import { BgvCheckType } from '@prisma/client';
import {
  BgvCandidatePayload,
  BgvWebhookEvent,
  IBgvProvider,
  VendorCheckStatus,
} from './bgv-provider.interface';

/**
 * IDfy stub — same shape as the OnGrid stub, ready for fleshing out when the
 * tenant volume justifies a second active vendor.
 */
@Injectable()
export class IDfyProvider implements IBgvProvider {
  readonly name = 'idfy' as const;

  async initiateProfile() {
    return { vendorRefId: `dev-idfy-${Date.now()}` };
  }

  async submitCheck(_input: { vendorProfileRefId: string; type: BgvCheckType; payload: Record<string, unknown> }) {
    return { vendorCheckRefId: `dev-idfy-chk-${Date.now()}` };
  }

  async getCheckStatus(vendorCheckRefId: string): Promise<VendorCheckStatus> {
    if (vendorCheckRefId.startsWith('dev-idfy-')) return { status: 'IN_PROGRESS', finding: 'PENDING' };
    throw new NotImplementedException('IDfy.getCheckStatus not yet implemented');
  }

  async downloadReport(): Promise<Buffer> {
    throw new NotImplementedException('IDfy.downloadReport not yet implemented');
  }

  verifyWebhook() {
    return false;
  }

  parseWebhookEvent(): BgvWebhookEvent | null {
    return null;
  }
}
