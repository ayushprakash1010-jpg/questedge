import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { JobQueueService } from '../job-queue/job-queue.service';
import { HireDetectionService } from './hire-detection.service';

/**
 * pg-boss cron workers for hire bypass detection.
 *
 * Three scheduled jobs:
 *  1. "hire-detection-scan" — Daily at 3 AM: Scans for stale referrals + suspicious patterns
 *  2. "hire-confirmation-check" — Weekly on Mondays at 9 AM: Sends confirmation requests to companies
 *  3. "candidate-check-in" — Bi-weekly on 1st and 15th at 10 AM: Sends check-ins to candidates
 *  4. "trust-score-recalc" — Weekly on Sundays at 2 AM: Recalculates all company trust scores
 */
@Injectable()
export class HireDetectionWorker implements OnModuleInit {
  private readonly logger = new Logger(HireDetectionWorker.name);

  constructor(
    private readonly queue: JobQueueService,
    private readonly hireDetection: HireDetectionService,
  ) {}

  async onModuleInit() {
    // ── Queue setup ──────────────────────────────────────────────
    await this.queue.ensureQueue('hire-detection-scan');
    await this.queue.ensureQueue('hire-confirmation-check');
    await this.queue.ensureQueue('candidate-check-in');
    await this.queue.ensureQueue('trust-score-recalc');

    // ── Schedule cron jobs ───────────────────────────────────────

    // Daily at 3 AM — stale referral detection
    await this.queue.scheduleCron('hire-detection-scan', '0 3 * * *');

    // Weekly on Mondays at 9 AM — company hire confirmation checks
    await this.queue.scheduleCron('hire-confirmation-check', '0 9 * * 1');

    // Bi-weekly (1st and 15th) at 10 AM — candidate check-ins
    await this.queue.scheduleCron('candidate-check-in', '0 10 1,15 * *');

    // Weekly on Sundays at 2 AM — trust score recalculation
    await this.queue.scheduleCron('trust-score-recalc', '0 2 * * 0');

    // ── Register workers ─────────────────────────────────────────

    await this.queue.registerWorker('hire-detection-scan', async () => {
      try {
        const result = await this.hireDetection.runStaleReferralScan();
        this.logger.log(
          `Stale referral scan: ${result.flagsCreated} flags, ${result.orgsScanned} orgs`,
        );
      } catch (error) {
        this.logger.error('Stale referral scan failed:', error);
      }
    });

    await this.queue.registerWorker('hire-confirmation-check', async () => {
      try {
        const result = await this.hireDetection.runHireConfirmationChecks();
        this.logger.log(
          `Hire confirmation: ${result.notificationsSent} sent, ${result.escalations} escalations, ${result.paused} paused`,
        );
      } catch (error) {
        this.logger.error('Hire confirmation check failed:', error);
      }
    });

    await this.queue.registerWorker('candidate-check-in', async () => {
      try {
        const result = await this.hireDetection.runCandidateCheckIns();
        this.logger.log(`Candidate check-ins: ${result.checksSent} sent`);
      } catch (error) {
        this.logger.error('Candidate check-in dispatch failed:', error);
      }
    });

    await this.queue.registerWorker('trust-score-recalc', async () => {
      try {
        const result = await this.hireDetection.recalculateTrustScores();
        this.logger.log(`Trust score recalc: ${result.orgsUpdated} orgs updated`);
      } catch (error) {
        this.logger.error('Trust score recalculation failed:', error);
      }
    });

    this.logger.log('Hire detection workers registered');
  }
}
