import { Module } from '@nestjs/common';
import { BgvModule } from '../bgv/bgv.module';
import { CompensationModule } from '../compensation/compensation.module';
import { JobQueueModule } from '../job-queue/job-queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OffersController } from './offers.controller';
import { OffersPublicController } from './offers.public.controller';
import { OffersService } from './offers.service';
import { OffersWebhooksController } from './offers.webhooks.controller';
import { ESignPollerWorker } from './services/esign-poller.worker';
import { OfferAiService } from './services/offer-ai.service';
import { OfferApprovalService } from './services/offer-approval.service';
import { OfferESignService } from './services/offer-esign.service';
import { OfferRenderService } from './services/offer-render.service';

@Module({
  imports: [BgvModule, CompensationModule, JobQueueModule, NotificationsModule],
  controllers: [OffersController, OffersPublicController, OffersWebhooksController],
  providers: [
    OffersService,
    OfferApprovalService,
    OfferRenderService,
    OfferESignService,
    OfferAiService,
    ESignPollerWorker,
  ],
  exports: [OffersService, OfferRenderService],
})
export class OffersModule {}
