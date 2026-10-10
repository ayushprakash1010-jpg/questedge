import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendWhatsAppNotification(managerPhone: string, managerName: string, title: string, status: string, link: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    const message = `Hi ${managerName}, the mandate "${title}" is now ${status}. View it here: ${link}`;

    if (!sid || !token) {
      this.logger.log(`[WhatsApp Mock to ${managerPhone}] ${message}`);
      return { success: true, mocked: true };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const params = new URLSearchParams({
        To: `whatsapp:${managerPhone.startsWith('+') ? managerPhone : '+' + managerPhone}`,
        From: fromPhone,
        Body: message
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Twilio API Error: ${response.status} - ${errorData}`);
      }

      this.logger.log(`[WhatsApp Real] Successfully sent message to ${managerPhone}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
