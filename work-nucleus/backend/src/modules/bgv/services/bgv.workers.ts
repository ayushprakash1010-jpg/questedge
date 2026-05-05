import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { BgvService } from '../bgv.service';

const START_QUEUE = 'bgv.start';
const POLL_QUEUE = 'bgv.poll';

@Injectable()
export class BgvWorkers implements OnModuleInit {
  private readonly logger = new Logger(BgvWorkers.name);

  constructor(
    private readonly queue: JobQueueService,
    private readonly service: BgvService,
  ) {}

  async onModuleInit() {
    await this.queue.ensureQueue(START_QUEUE);
    await this.queue.ensureQueue(POLL_QUEUE);

    await this.queue.registerWorker<{ profileId: string }>(START_QUEUE, async (jobs) => {
      for (const job of jobs) {
        try {
          await this.service.dispatchPendingChecks(job.data.profileId);
        } catch (err) {
          this.logger.error(`bgv.start failed for ${job.data.profileId}: ${err}`);
        }
      }
    });

    await this.queue.scheduleCron(POLL_QUEUE, '*/5 * * * *', {});
    await this.queue.registerWorker(POLL_QUEUE, async () => {
      try {
        await this.service.pollOpenChecks();
      } catch (err) {
        this.logger.error(`bgv.poll failed: ${err}`);
      }
    });

    this.logger.log('BGV workers registered (start + poll every 5 min)');
  }
}
