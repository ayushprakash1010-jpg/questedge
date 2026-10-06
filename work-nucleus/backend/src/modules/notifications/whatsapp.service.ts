import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendWhatsAppNotification(managerName: string, title: string, status: string, link: string) {
    try {
      this.logger.log(`[WhatsApp Mock] Sending message to ${managerName}`);
      this.logger.log(`[WhatsApp Mock] Message: Hi ${managerName}, the mandate "${title}" is now ${status}. View it here: ${link}`);
      
      // In a real implementation, this would call the WhatsApp Business API or Twilio API.
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
