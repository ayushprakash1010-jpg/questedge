import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { AggregationService } from '../services/aggregation.service';

@Injectable()
export class ExternalJobsSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(ExternalJobsSyncWorker.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly queue: JobQueueService,
    private readonly aggregation: AggregationService,
    private readonly config: ConfigService,
  ) {
    this.isEnabled =
      this.config.get<string>('FEATURE_EXTERNAL_JOBS', 'false') === 'true';
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.log(
        'External jobs feature is disabled, skipping worker registration',
      );
      return;
    }

    // ATS sync every 6 hours
    await this.queue.ensureQueue('external-jobs-ats-sync');
    await this.queue.scheduleCron('external-jobs-ats-sync', '0 */6 * * *');
    await this.queue.registerWorker('external-jobs-ats-sync', async () => {
      await this.handleAtsSync();
    });

    // Remote boards sync every 12 hours
    await this.queue.ensureQueue('external-jobs-remote-sync');
    await this.queue.scheduleCron('external-jobs-remote-sync', '0 */12 * * *');
    await this.queue.registerWorker('external-jobs-remote-sync', async () => {
      await this.handleRemoteSync();
    });

    // Expiry check daily at 3 AM
    await this.queue.ensureQueue('external-jobs-expiry');
    await this.queue.scheduleCron('external-jobs-expiry', '0 3 * * *');
    await this.queue.registerWorker('external-jobs-expiry', async () => {
      await this.handleExpiryCheck();
    });

    this.logger.log('External jobs sync workers registered');
  }

  private async handleAtsSync() {
    this.logger.log('Starting ATS source sync...');
    try {
      const results = await this.aggregation.syncAtsSources();
      const summary = results
        .map(
          (r) =>
            `${r.source}: +${r.created}/${r.updated}u/${r.skipped}s`,
        )
        .join(', ');
      this.logger.log(`ATS sync complete: ${summary}`);
    } catch (err: any) {
      this.logger.error(`ATS sync failed: ${err.message}`, err.stack);
    }
  }

  private async handleRemoteSync() {
    this.logger.log('Starting remote sources sync...');
    try {
      const results = await this.aggregation.syncRemoteSources();
      const summary = results
        .map((r) => `${r.source}: +${r.created}/${r.updated}u`)
        .join(', ');
      this.logger.log(`Remote sync complete: ${summary}`);
    } catch (err: any) {
      this.logger.error(`Remote sync failed: ${err.message}`, err.stack);
    }
  }

  private async handleExpiryCheck() {
    this.logger.log('Starting expiry check...');
    try {
      const count = await this.aggregation.markExpiredJobs();
      this.logger.log(`Expiry check complete: ${count} jobs marked expired`);
    } catch (err: any) {
      this.logger.error(`Expiry check failed: ${err.message}`, err.stack);
    }
  }
}
