import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AggregationService } from '../services/aggregation.service';
import { MatchPrecomputeService } from '../services/match-precompute.service';

@Injectable()
export class ExternalJobsSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(ExternalJobsSyncWorker.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly queue: JobQueueService,
    private readonly aggregation: AggregationService,
    private readonly matchPrecompute: MatchPrecomputeService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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

    // Aggregator sources sync once daily at 6 AM (Careerjet, JSearch)
    await this.queue.ensureQueue('external-jobs-aggregator-sync');
    await this.queue.scheduleCron('external-jobs-aggregator-sync', '0 6 * * *');
    await this.queue.registerWorker('external-jobs-aggregator-sync', async () => {
      await this.handleAggregatorSync();
    });

    // Expiry check daily at 3 AM
    await this.queue.ensureQueue('external-jobs-expiry');
    await this.queue.scheduleCron('external-jobs-expiry', '0 3 * * *');
    await this.queue.registerWorker('external-jobs-expiry', async () => {
      await this.handleExpiryCheck();
    });

    // URL health-check probe every 30 minutes (25 active jobs per run)
    await this.queue.ensureQueue('external-jobs-url-verify');
    await this.queue.scheduleCron('external-jobs-url-verify', '*/30 * * * *');
    await this.queue.registerWorker('external-jobs-url-verify', async () => {
      await this.handleUrlVerification();
    });

    // Match pre-computation every 6 hours (offset by 30 min from ATS sync)
    await this.queue.ensureQueue('external-jobs-match-compute');
    await this.queue.scheduleCron('external-jobs-match-compute', '30 */6 * * *');
    await this.queue.registerWorker('external-jobs-match-compute', async () => {
      await this.handleMatchCompute();
    });

    this.logger.log('External jobs sync workers registered (all sources + match pre-compute)');

    // Trigger initial background sync on boot if no jobs exist
    this.triggerInitialSyncIfEmpty();
  }

  async triggerImmediateSync(): Promise<{ status: string }> {
    this.logger.log('Triggering immediate full sync across all 8 sources...');
    setImmediate(async () => {
      try {
        await this.aggregation.seedDefaultSources();
        await this.handleAtsSync();
        await this.handleRemoteSync();
        await this.handleAggregatorSync();
        await this.handleMatchCompute();
        this.logger.log('Immediate full sync finished successfully!');
      } catch (err: any) {
        this.logger.error(`Immediate sync failed: ${err.message}`, err.stack);
      }
    });
    return { status: 'Sync initiated in background' };
  }

  private async triggerInitialSyncIfEmpty() {
    try {
      const count = await this.prisma.externalJob.count();
      if (count === 0) {
        this.logger.log('0 external jobs found in DB. Starting automatic initial sync...');
        await this.triggerImmediateSync();
      } else {
        this.logger.log(`Found ${count} external jobs in DB.`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not check external job count: ${err.message}`);
    }
  }

  async handleAtsSync() {
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

  async handleRemoteSync() {
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

  async handleAggregatorSync() {
    this.logger.log('Starting aggregator sources sync (Careerjet, JSearch)...');
    try {
      const results = await this.aggregation.syncAggregatorSources();
      const summary = results
        .map((r) => `${r.source}: +${r.created}/${r.updated}u/${r.errors.length}e`)
        .join(', ');
      this.logger.log(`Aggregator sync complete: ${summary}`);
    } catch (err: any) {
      this.logger.error(`Aggregator sync failed: ${err.message}`, err.stack);
    }
  }

  async handleExpiryCheck() {
    this.logger.log('Starting expiry check...');
    try {
      const count = await this.aggregation.markExpiredJobs();
      this.logger.log(`Expiry check complete: ${count} jobs marked expired`);
    } catch (err: any) {
      this.logger.error(`Expiry check failed: ${err.message}`, err.stack);
    }
  }

  async handleUrlVerification() {
    this.logger.log('Starting URL health-check verification probe...');
    try {
      const result = await this.aggregation.verifyJobUrls(25);
      this.logger.log(
        `URL verification probe complete: ${result.checked} checked, ${result.verified} active, ${result.deactivated} deactivated (404/410)`,
      );
    } catch (err: any) {
      this.logger.error(`URL verification probe failed: ${err.message}`, err.stack);
    }
  }

  async handleMatchCompute() {
    this.logger.log('Starting match pre-computation...');
    try {
      const result = await this.matchPrecompute.computeAllMatches();
      this.logger.log(
        `Match computation complete: ${result.candidatesProcessed} candidates, ${result.matchesWritten} matches`,
      );
    } catch (err: any) {
      this.logger.error(`Match computation failed: ${err.message}`, err.stack);
    }
  }
}
