import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendConsentRequest(params: SendConsentEmailParams): Promise<void> {
    const consentLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/consent/${params.consentToken}`;
    
    // Fallback to mock if credentials are not provided
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.log('----------------------------------------------------');
      this.logger.log(`📧 MOCK EMAIL SENT TO: ${params.toEmail}`);
      this.logger.log(`Subject: ${params.recruiterName} referred you for ${params.mandateTitle} at ${params.companyName}`);
      this.logger.log(`Hi ${params.candidateName},`);
      this.logger.log(`${params.recruiterName} thinks you'd be a great fit for the ${params.mandateTitle} role at ${params.companyName}.`);
      this.logger.log(`Please review and accept the referral to proceed:`);
      this.logger.log(`🔗 ${consentLink}`);
      this.logger.log('----------------------------------------------------');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"QuestEdge Referral" <${process.env.SMTP_USER}>`,
        to: params.toEmail,
        subject: `${params.recruiterName} referred you for ${params.mandateTitle} at ${params.companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been referred!</h2>
            <p>Hi ${params.candidateName},</p>
            <p><strong>${params.recruiterName}</strong> thinks you'd be a great fit for the <strong>${params.mandateTitle}</strong> role at <strong>${params.companyName}</strong>.</p>
            <p>Please review and accept the referral to proceed:</p>
            <a href="${consentLink}" style="display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #059669; color: white; text-decoration: none; border-radius: 5px;">Review Referral</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">If you didn't expect this email, you can safely ignore it.</p>
          </div>
        `,
      });
      this.logger.log(`📧 REAL EMAIL SENT TO: ${params.toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.toEmail}`, error);
    }
  }

  async sendReferralStatusUpdate(params: {
    toEmail: string;
    recruiterName: string;
    candidateName: string;
    mandateTitle: string;
    newStatus: string;
  }): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.log('----------------------------------------------------');
      this.logger.log(`📧 MOCK EMAIL SENT TO: ${params.toEmail}`);
      this.logger.log(`Subject: Update on your referral for ${params.candidateName}`);
      this.logger.log(`Hi ${params.recruiterName},`);
      this.logger.log(`The status of your referral ${params.candidateName} for the ${params.mandateTitle} role has changed to: ${params.newStatus}.`);
      this.logger.log('----------------------------------------------------');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"QuestEdge Updates" <${process.env.SMTP_USER}>`,
        to: params.toEmail,
        subject: `Update on your referral for ${params.candidateName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Referral Status Update</h2>
            <p>Hi ${params.recruiterName},</p>
            <p>The status of your referral <strong>${params.candidateName}</strong> for the <strong>${params.mandateTitle}</strong> role has changed to: <strong>${params.newStatus}</strong>.</p>
          </div>
        `,
      });
      this.logger.log(`📧 REAL STATUS EMAIL SENT TO: ${params.toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send status email to ${params.toEmail}`, error);
    }
  }
}
