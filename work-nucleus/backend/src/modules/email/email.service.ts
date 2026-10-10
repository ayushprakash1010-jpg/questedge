import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    // Safely initialize Resend only if key exists
    const key = process.env.RESEND_API_KEY;
    if (key) {
      this.resend = new Resend(key);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.resend || !process.env.RESEND_API_KEY) {
      this.logger.log(`[MOCK EMAIL to ${to}] Subject: ${subject}`);
      return;
    }

    try {
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'QuestEdge <hello@questedge.com>';
      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      } else {
        this.logger.log(`Email sent to ${to} (ID: ${data?.id})`);
      }
    } catch (err) {
      this.logger.error(`Exception while sending email: ${err.message}`);
    }
  }

  async sendNotificationEmail(to: string, title: string, body: string, actionUrl?: string) {
    const html = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">${body}</p>
        ${
          actionUrl
            ? `<div style="margin-top: 30px;">
                 <a href="${actionUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Details</a>
               </div>`
            : ''
        }
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
          <p>QuestEdge — The Referral-Based Hiring Marketplace</p>
        </div>
      </div>
    `;
    return this.sendEmail(to, title, html);
  }
}
