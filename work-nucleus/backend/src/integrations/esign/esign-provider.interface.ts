export interface ESignSigner {
  email: string;
  phone?: string;
  name: string;
}

export interface ESignCreateInput {
  pdfBuffer: Buffer;
  fileName: string;
  signers: ESignSigner[];
  expireInDays?: number;
  webhookSecret?: string;
}

export interface ESignCreateResult {
  providerReqId: string;
  signUrl?: string;
}

export interface ESignStatusResult {
  status: 'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'EXPIRED' | 'FAILED';
  signedAt?: Date;
  auditTrailUrl?: string;
}

export interface IESignProvider {
  readonly name: 'digio' | 'leegality';
  createSignRequest(input: ESignCreateInput): Promise<ESignCreateResult>;
  getStatus(providerReqId: string): Promise<ESignStatusResult>;
  downloadSigned(providerReqId: string): Promise<Buffer>;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): boolean;
  parseWebhookEvent(body: unknown): { providerReqId: string; status: ESignStatusResult['status'] } | null;
}
