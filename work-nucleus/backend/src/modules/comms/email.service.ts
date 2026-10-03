import { Injectable, Logger } from '@nestjs/common';

export interface SendConsentEmailParams {
  toEmail: string;
  candidateName: string;
  recruiterName: string;
  companyName: string;
  mandateTitle: string;
  consentToken: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * MVP: Mock email sender. In a real environment, this would integrate
   * with Resend or SendGrid.
   */
  async sendConsentRequest(params: SendConsentEmailParams): Promise<void> {
    const consentLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/consent/${params.consentToken}`;
    
    this.logger.log('----------------------------------------------------');
    this.logger.log(`📧 MOCK EMAIL SENT TO: ${params.toEmail}`);
    this.logger.log(`Subject: ${params.recruiterName} referred you for ${params.mandateTitle} at ${params.companyName}`);
    this.logger.log(`Hi ${params.candidateName},`);
    this.logger.log(`${params.recruiterName} thinks you'd be a great fit for the ${params.mandateTitle} role at ${params.companyName}.`);
    this.logger.log(`Please review and accept the referral to proceed:`);
    this.logger.log(`🔗 ${consentLink}`);
    this.logger.log('----------------------------------------------------');
  }

  async sendReferralStatusUpdate(params: {
    toEmail: string;
    recruiterName: string;
    candidateName: string;
    mandateTitle: string;
    newStatus: string;
  }): Promise<void> {
    this.logger.log('----------------------------------------------------');
    this.logger.log(`📧 MOCK EMAIL SENT TO: ${params.toEmail}`);
    this.logger.log(`Subject: Update on your referral for ${params.candidateName}`);
    this.logger.log(`Hi ${params.recruiterName},`);
    this.logger.log(`The status of your referral ${params.candidateName} for the ${params.mandateTitle} role has changed to: ${params.newStatus}.`);
    this.logger.log('----------------------------------------------------');
  }
}
