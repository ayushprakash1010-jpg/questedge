import { Module } from '@nestjs/common';
import { JobQueueModule } from '../job-queue/job-queue.module';
import { BgvController } from './bgv.controller';
import { BgvPublicController } from './bgv.public.controller';
import { BgvService } from './bgv.service';
import { BgvWebhooksController } from './bgv.webhooks.controller';
import { BgvAiService } from './services/bgv-ai.service';
import { BgvWorkers } from './services/bgv.workers';

@Module({
  imports: [JobQueueModule],
  controllers: [BgvController, BgvPublicController, BgvWebhooksController],
  providers: [BgvService, BgvAiService, BgvWorkers],
  exports: [BgvService],
})
export class BgvModule {}
