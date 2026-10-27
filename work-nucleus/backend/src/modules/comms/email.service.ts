import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

export interface SendConsentEmailParams {
  toEmail: string;
  candidateName: string;
  recruiterName: string;
  companyName: string;
  mandateTitle: string;
  consentToken: string;
}

/**
 * Escapes unsafe characters for HTML injection prevention (P0-11 / F-13).
 */
function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  private getFrontendUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('FRONTEND_URL env var is not set in production! Defaulting to https://questedge.vercel.app');
        return 'https://questedge.vercel.app';
      }
      return 'http://localhost:3000';
    }
    return frontendUrl.replace(/\/+$/, '');
  }

  async sendConsentRequest(params: SendConsentEmailParams): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const safeToken = encodeURIComponent(params.consentToken);
    const consentLink = `${frontendUrl}/consent/${safeToken}`;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    // Escaped values for safe HTML rendering
    const safeCandidate = escapeHtml(params.candidateName);
    const safeRecruiter = escapeHtml(params.recruiterName);
    const safeCompany = escapeHtml(params.companyName);
    const safeMandate = escapeHtml(params.mandateTitle);

    // Fallback to mock if credentials are not provided
    if (!process.env.SENDGRID_API_KEY || !fromEmail) {
      this.logger.log('----------------------------------------------------');
      this.logger.log(`📧 MOCK EMAIL SENT TO: ${params.toEmail}`);
      this.logger.log(
        `Subject: ${params.recruiterName} referred you for ${params.mandateTitle} at ${params.companyName}`,
      );
      this.logger.log(`Hi ${safeCandidate},`);
      this.logger.log(
        `${safeRecruiter} thinks you'd be a great fit for the ${safeMandate} role at ${safeCompany}.`,
      );
      this.logger.log(`Please review and accept the referral to proceed:`);
      // P0-11: Redact raw token in logs to prevent token leakage
      const maskedToken = params.consentToken ? `${params.consentToken.slice(0, 6)}...[REDACTED]` : '[NONE]';
      this.logger.log(`🔗 ${frontendUrl}/consent/${maskedToken}`);
      this.logger.log('----------------------------------------------------');
      return;
    }

    try {
      await sgMail.send({
        from: `"QuestEdge Referral" <${fromEmail}>`,
        to: params.toEmail,
        subject: `${params.recruiterName} referred you for ${params.mandateTitle} at ${params.companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been referred!</h2>
            <p>Hi ${safeCandidate},</p>
            <p><strong>${safeRecruiter}</strong> thinks you'd be a great fit for the <strong>${safeMandate}</strong> role at <strong>${safeCompany}</strong>.</p>
            <p>Please review and accept the referral to proceed:</p>
            <a href="${consentLink}" style="display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #059669; color: white; text-decoration: none; border-radius: 5px;">Review Referral</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">If you didn't expect this email, you can safely ignore it.</p>
          </div>
        `,
      });
      this.logger.log(`📧 SENDGRID EMAIL SENT TO: ${params.toEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${params.toEmail}`);
      if (error.response) {
        this.logger.error(error.response.body);
      }
    }
  }

  async sendReferralStatusUpdate(params: {
    toEmail: string;
    recruiterName: string;
    candidateName: string;
    mandateTitle: string;
    newStatus: string;
  }): Promise<void> {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const safeCandidate = escapeHtml(params.candidateName);
    const safeRecruiter = escapeHtml(params.recruiterName);
    const safeMandate = escapeHtml(params.mandateTitle);
    const safeStatus = escapeHtml(params.newStatus);

    if (!process.env.SENDGRID_API_KEY || !fromEmail) {
      this.logger.log('----------------------------------------------------');
      this.logger.log(`📧 MOCK STATUS EMAIL SENT TO: ${params.toEmail}`);
      this.logger.log(
        `Subject: Update on your referral for ${params.candidateName}`,
      );
      this.logger.log(`Hi ${safeRecruiter},`);
      this.logger.log(
        `The status of your referral ${safeCandidate} for the ${safeMandate} role has changed to: ${safeStatus}.`,
      );
      this.logger.log('----------------------------------------------------');
      return;
    }

    try {
      await sgMail.send({
        from: `"QuestEdge Updates" <${fromEmail}>`,
        to: params.toEmail,
        subject: `Update on your referral for ${params.candidateName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Referral Status Update</h2>
            <p>Hi ${safeRecruiter},</p>
            <p>The status of your referral <strong>${safeCandidate}</strong> for the <strong>${safeMandate}</strong> role has changed to: <strong>${safeStatus}</strong>.</p>
          </div>
        `,
      });
      this.logger.log(`📧 SENDGRID STATUS EMAIL SENT TO: ${params.toEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send status email to ${params.toEmail}`);
      if (error.response) {
        this.logger.error(error.response.body);
      }
    }
  }
}
