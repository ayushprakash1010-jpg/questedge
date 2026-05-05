import { Injectable, NotImplementedException } from '@nestjs/common';
import { BgvCheckType } from '@prisma/client';
import {
  BgvCandidatePayload,
  BgvWebhookEvent,
  IBgvProvider,
  VendorCheckStatus,
} from './bgv-provider.interface';

/**
 * OnGrid stub — interface preserved so OrgSettings.bgvProvider can route here
 * once the full integration is built. Sandbox returns deterministic fake ids.
 */
@Injectable()
export class OnGridProvider implements IBgvProvider {
  readonly name = 'ongrid' as const;

  async initiateProfile(_input: { candidate: BgvCandidatePayload; orgRefId: string }) {
    return { vendorRefId: `dev-ongrid-${Date.now()}` };
  }

  async submitCheck(input: { vendorProfileRefId: string; type: BgvCheckType; payload: Record<string, unknown> }) {
    return { vendorCheckRefId: `dev-ongrid-chk-${Date.now()}` };
  }

  async getCheckStatus(vendorCheckRefId: string): Promise<VendorCheckStatus> {
    if (vendorCheckRefId.startsWith('dev-ongrid-')) return { status: 'IN_PROGRESS', finding: 'PENDING' };
    throw new NotImplementedException('OnGrid.getCheckStatus not yet implemented');
  }

  async downloadReport(_vendorCheckRefId: string): Promise<Buffer> {
    throw new NotImplementedException('OnGrid.downloadReport not yet implemented');
  }

  verifyWebhook() {
    return false;
  }

  parseWebhookEvent(): BgvWebhookEvent | null {
    return null;
  }
}
