import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url?: string): string | null {
  if (!url) return null;
  // Allow relative URLs starting with / or absolute http/https URLs
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) {
    return encodeURI(url);
  }
  return null;
}

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
      const fromAddress =
        process.env.RESEND_FROM_EMAIL || 'QuestEdge <hello@questedge.com>';
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
    } catch (err: any) {
      this.logger.error(`Exception while sending email: ${err.message}`);
    }
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    body: string,
    actionUrl?: string,
  ) {
    const safeTitle = escapeHtml(title);
    const safeBody = escapeHtml(body);
    const safeActionUrl = sanitizeUrl(actionUrl);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">${safeTitle}</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">${safeBody}</p>
        ${
          safeActionUrl
            ? `<div style="margin-top: 30px;">
                 <a href="${safeActionUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Details</a>
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
