import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import type { SendOptions, WorkOptions, ScheduleOptions, Job } from 'pg-boss';

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  public boss: PgBoss;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>('DATABASE_URL')!;
    this.boss = new PgBoss({
      connectionString,
      persistWarnings: true,
    });
  }

  async onModuleInit() {
    this.boss.on('error', (error: Error) => {
      this.logger.error(`pg-boss error: ${error.message}`, error.stack);
    });

    await this.boss.start();
    this.logger.log('pg-boss started');
  }

  async onModuleDestroy() {
    await this.boss.stop({ graceful: true, timeout: 10000 });
    this.logger.log('pg-boss stopped');
  }

  /**
   * Create a queue if it doesn't already exist. Idempotent.
   */
  async ensureQueue(name: string) {
    const existing = await this.boss.getQueue(name);
    if (!existing) {
      await this.boss.createQueue(name);
      this.logger.log(`Created queue "${name}"`);
    }
  }

  async scheduleCron(
    name: string,
    cron: string,
    data?: object,
    options?: ScheduleOptions,
  ) {
    await this.boss.schedule(name, cron, data ?? {}, options);
    this.logger.log(`Scheduled cron "${name}" with expression "${cron}"`);
  }

  async enqueue(name: string, data: object, options?: SendOptions) {
    const jobId = await this.boss.send(name, data, options);
    this.logger.log(`Enqueued job "${name}" → ${jobId}`);
    return jobId;
  }

  /**
   * Register a worker. The handler receives a batch of jobs (default batchSize=1).
   */
  async registerWorker<T = any>(
    name: string,
    handler: (job: Job<T>[]) => Promise<void>,
    options?: WorkOptions,
  ) {
    await this.boss.work<T>(name, options ?? {}, handler);
    this.logger.log(`Worker registered for "${name}"`);
  }
}
