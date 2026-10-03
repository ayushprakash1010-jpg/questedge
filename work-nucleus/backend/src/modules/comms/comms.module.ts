import { Module } from '@nestjs/common';
import { Msg91Module } from '../../integrations/msg91/msg91.module';
import { CommsController, Msg91WebhookController } from './comms.controller';
import { CommsService } from './comms.service';
import { EmailService } from './email.service';

@Module({
  imports: [Msg91Module],
  controllers: [CommsController, Msg91WebhookController],
  providers: [CommsService, EmailService],
  exports: [CommsService, EmailService],
})
export class CommsModule {}
