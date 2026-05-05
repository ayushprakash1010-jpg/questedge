import { BgvCheckType } from '@prisma/client';

export interface BgvCandidatePayload {
  fullName: string;
  email: string;
  phone?: string;
  dob?: string;
}

export interface VendorCheckStatus {
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  finding?: 'PENDING' | 'CLEAR' | 'DISCREPANCY' | 'UNABLE_TO_VERIFY';
  reportUrl?: string;
  rawResponse?: unknown;
  failureReason?: string;
  costInPaise?: number;
}

export interface BgvWebhookEvent {
  vendorCheckRefId: string;
  status: VendorCheckStatus['status'];
  finding?: VendorCheckStatus['finding'];
  reportUrl?: string;
}

export interface IBgvProvider {
  readonly name: 'authbridge' | 'ongrid' | 'idfy' | 'springverify';

  initiateProfile(input: { candidate: BgvCandidatePayload; orgRefId: string }): Promise<{ vendorRefId: string }>;

  submitCheck(input: {
    vendorProfileRefId: string;
    type: BgvCheckType;
    payload: Record<string, unknown>;
  }): Promise<{ vendorCheckRefId: string }>;

  getCheckStatus(vendorCheckRefId: string): Promise<VendorCheckStatus>;

  downloadReport(vendorCheckRefId: string): Promise<Buffer>;

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): boolean;

  parseWebhookEvent(body: unknown): BgvWebhookEvent | null;
}
