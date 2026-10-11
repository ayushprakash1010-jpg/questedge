import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendWhatsAppNotification(managerPhone: string, managerName: string, title: string, status: string, link: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    const testRecipient = process.env.TWILIO_TEST_RECIPIENT_PHONE;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    const rawRecipient = testRecipient || managerPhone;
    if (!rawRecipient) {
      this.logger.warn('No manager phone provided for WhatsApp notification.');
      return { success: false, error: 'No phone number provided' };
    }

    const cleanPhone = rawRecipient.replace(/^whatsapp:/, '').trim();
    const formattedTo = `whatsapp:${cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone}`;
    const formattedFrom = fromPhone.startsWith('whatsapp:') ? fromPhone : `whatsapp:${fromPhone}`;

    const message = `Hi ${managerName}, the mandate "${title}" is now ${status}. View it here: ${link}`;

    if (!sid || !token) {
      this.logger.log(`[WhatsApp Mock to ${formattedTo}] ${message}`);
      return { success: true, mocked: true, message };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const bodyParams: Record<string, string> = {
        To: formattedTo,
        From: formattedFrom,
      };

      if (contentSid) {
        bodyParams.ContentSid = contentSid;
        bodyParams.ContentVariables = JSON.stringify({
          '1': managerName,
          '2': title,
          '3': status,
          '4': link,
        });
        this.logger.log(`Sending WhatsApp via Twilio ContentSid ${contentSid} to ${formattedTo}`);
      } else {
        bodyParams.Body = message;
        this.logger.log(`Sending WhatsApp via freeform Body to ${formattedTo}`);
      }

      const params = new URLSearchParams(bodyParams);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Twilio API Error: ${response.status} - ${responseText}`);
      }

      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (_) {}

      this.logger.log(`[WhatsApp Real] Successfully queued message to ${formattedTo}. Twilio SID: ${parsedData.sid}`);
      return { success: true, sid: parsedData.sid, status: parsedData.status };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
