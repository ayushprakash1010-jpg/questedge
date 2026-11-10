import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GreenhouseConnector } from '../connectors/greenhouse.connector';
import { LeverConnector } from '../connectors/lever.connector';
import { AshbyConnector } from '../connectors/ashby.connector';
import { JobicyConnector } from '../connectors/jobicy.connector';
import { RemotiveConnector } from '../connectors/remotive.connector';
import { RemoteOKConnector } from '../connectors/remoteok.connector';
import { CareerjetConnector } from '../connectors/careerjet.connector';
import { JSearchConnector } from '../connectors/jsearch.connector';
import { NormalizerService, NormalizedJob } from './normalizer.service';
import { IJobSourceConnector } from '../connectors/connector.interface';
import { CircuitBreaker } from './circuit-breaker';

export interface SyncResult {
  source: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);
  private readonly circuitBreaker = new CircuitBreaker(3, 30);

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: NormalizerService,
    private readonly greenhouse: GreenhouseConnector,
    private readonly lever: LeverConnector,
    private readonly ashby: AshbyConnector,
    private readonly jobicy: JobicyConnector,
    private readonly remotive: RemotiveConnector,
    private readonly remoteok: RemoteOKConnector,
    private readonly careerjet: CareerjetConnector,
    private readonly jsearch: JSearchConnector,
  ) {}

  /**
   * Sync all ATS board sources (Greenhouse, Lever, Ashby).
   */
  async syncAtsSources(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    let configs = await this.prisma.jobSourceConfig.findMany({
      where: { isActive: true },
    });

    if (configs.length === 0) {
      this.logger.log('No active job source configs found. Auto-seeding from seed-companies.json...');
      await this.seedDefaultSources();
      configs = await this.prisma.jobSourceConfig.findMany({
        where: { isActive: true },
      });
    }

    const grouped: Record<string, string[]> = {};
    for (const config of configs) {
      if (!grouped[config.sourceName]) {
        grouped[config.sourceName] = [];
      }
      grouped[config.sourceName].push(config.companySlug);
    }

    const connectorMap: Record<string, IJobSourceConnector> = {
      greenhouse: this.greenhouse,
      lever: this.lever,
      ashby: this.ashby,
    };

    for (const [sourceName, slugs] of Object.entries(grouped)) {
      const connector = connectorMap[sourceName];
      if (!connector) continue;

      if (this.circuitBreaker.isOpen(sourceName)) {
        this.logger.warn(
          `Skipping ${sourceName} — circuit breaker is open`,
        );
        results.push({
          source: sourceName,
          fetched: 0, created: 0, updated: 0, skipped: 0,
          errors: ['Circuit breaker open — skipped'],
          durationMs: 0,
        });
        continue;
      }

      const start = Date.now();
      let result;
      try {
        result = await connector.fetchJobs(slugs);
      } catch (err: any) {
        this.circuitBreaker.recordFailure(sourceName);
        results.push({
          source: sourceName,
          fetched: 0, created: 0, updated: 0, skipped: 0,
          errors: [`Fatal: ${err.message}`],
          durationMs: Date.now() - start,
        });
        continue;
      }

      const syncResult: SyncResult = {
        source: sourceName,
        fetched: result.totalFetched,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: result.errors,
        durationMs: 0,
      };

      for (const rawJob of result.jobs) {
        try {
          const normalized = this.normalizer.normalize(rawJob, sourceName);
          const upsertResult = await this.upsertJob(normalized);
          if (upsertResult === 'created') syncResult.created++;
          else if (upsertResult === 'updated') syncResult.updated++;
          else syncResult.skipped++;
        } catch (err: any) {
          syncResult.errors.push(
            `Failed to upsert job ${rawJob.sourceId}: ${err.message}`,
          );
          syncResult.skipped++;
        }
      }

      syncResult.durationMs = Date.now() - start;
      results.push(syncResult);

      if (syncResult.errors.length === 0 || syncResult.created > 0) {
        this.circuitBreaker.recordSuccess(sourceName);
      } else if (syncResult.fetched === 0 && syncResult.errors.length > 0) {
        this.circuitBreaker.recordFailure(sourceName);
      }

      // Update source config sync status
      for (const slug of slugs) {
        await this.prisma.jobSourceConfig.updateMany({
          where: { sourceName, companySlug: slug },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus:
              syncResult.errors.length > 0 ? 'partial' : 'success',
            lastSyncCount: syncResult.created + syncResult.updated,
            errorMessage:
              syncResult.errors.length > 0
                ? syncResult.errors.slice(0, 3).join('; ')
                : null,
          },
        });
      }

      this.logger.log(
        `Synced ${sourceName}: ${syncResult.fetched} fetched, ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.skipped} skipped in ${syncResult.durationMs}ms`,
      );
    }

    return results;
  }

  /**
   * Sync remote job board sources (Jobicy, Remotive, RemoteOK).
   */
  async syncRemoteSources(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const remoteConnectors: IJobSourceConnector[] = [
      this.jobicy,
      this.remotive,
      this.remoteok,
    ];

    for (const connector of remoteConnectors) {
      if (this.circuitBreaker.isOpen(connector.sourceName)) {
        this.logger.warn(
          `Skipping ${connector.sourceName} — circuit breaker is open`,
        );
        results.push({
          source: connector.sourceName,
          fetched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: ['Circuit breaker open — skipped'],
          durationMs: 0,
        });
        continue;
      }

      const start = Date.now();
      let result;
      try {
        result = await connector.fetchJobs();
      } catch (err: any) {
        this.circuitBreaker.recordFailure(connector.sourceName);
        results.push({
          source: connector.sourceName,
          fetched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [`Fatal: ${err.message}`],
          durationMs: Date.now() - start,
        });
        continue;
      }

      const syncResult: SyncResult = {
        source: connector.sourceName,
        fetched: result.totalFetched,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: result.errors,
        durationMs: 0,
      };

      for (const rawJob of result.jobs) {
        try {
          const normalized = this.normalizer.normalize(
            rawJob,
            connector.sourceName,
          );
          const upsertResult = await this.upsertJob(normalized);
          if (upsertResult === 'created') syncResult.created++;
          else if (upsertResult === 'updated') syncResult.updated++;
          else syncResult.skipped++;
        } catch (err: any) {
          syncResult.errors.push(
            `Failed to upsert job ${rawJob.sourceId}: ${err.message}`,
          );
          syncResult.skipped++;
        }
      }

      syncResult.durationMs = Date.now() - start;
      results.push(syncResult);

      if (syncResult.errors.length === 0 || syncResult.created > 0) {
        this.circuitBreaker.recordSuccess(connector.sourceName);
      } else if (syncResult.fetched === 0 && syncResult.errors.length > 0) {
        this.circuitBreaker.recordFailure(connector.sourceName);
      }

      this.logger.log(
        `Synced ${connector.sourceName}: ${syncResult.fetched} fetched, ${syncResult.created} created, ${syncResult.updated} updated in ${syncResult.durationMs}ms`,
      );
    }

    return results;
  }

  /**
   * Sync aggregator sources (Careerjet, JSearch) — Indian market focus.
   * These connectors require API keys and have rate limits.
   */
  async syncAggregatorSources(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const aggregators: IJobSourceConnector[] = [
      this.careerjet,
      this.jsearch,
    ];

    for (const connector of aggregators) {
      if (this.circuitBreaker.isOpen(connector.sourceName)) {
        this.logger.warn(
          `Skipping ${connector.sourceName} — circuit breaker is open`,
        );
        results.push({
          source: connector.sourceName,
          fetched: 0, created: 0, updated: 0, skipped: 0,
          errors: ['Circuit breaker open — skipped'],
          durationMs: 0,
        });
        continue;
      }

      const start = Date.now();
      let result;
      try {
        result = await connector.fetchJobs();
      } catch (err: any) {
        this.circuitBreaker.recordFailure(connector.sourceName);
        results.push({
          source: connector.sourceName,
          fetched: 0, created: 0, updated: 0, skipped: 0,
          errors: [`Fatal: ${err.message}`],
          durationMs: Date.now() - start,
        });
        continue;
      }

      const syncResult: SyncResult = {
        source: connector.sourceName,
        fetched: result.totalFetched,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: result.errors,
        durationMs: 0,
      };

      for (const rawJob of result.jobs) {
        try {
          const normalized = this.normalizer.normalize(
            rawJob,
            connector.sourceName,
          );
          const upsertResult = await this.upsertJob(normalized);
          if (upsertResult === 'created') syncResult.created++;
          else if (upsertResult === 'updated') syncResult.updated++;
          else syncResult.skipped++;
        } catch (err: any) {
          syncResult.errors.push(
            `Failed to upsert job ${rawJob.sourceId}: ${err.message}`,
          );
          syncResult.skipped++;
        }
      }

      syncResult.durationMs = Date.now() - start;
      results.push(syncResult);

      if (syncResult.errors.length === 0 || syncResult.created > 0) {
        this.circuitBreaker.recordSuccess(connector.sourceName);
      } else if (syncResult.fetched === 0 && syncResult.errors.length > 0) {
        this.circuitBreaker.recordFailure(connector.sourceName);
      }

      this.logger.log(
        `Synced ${connector.sourceName}: ${syncResult.fetched} fetched, ${syncResult.created} created, ${syncResult.updated} updated in ${syncResult.durationMs}ms`,
      );
    }

    return results;
  }

  /**
   * Upsert a normalized job into the database.
   */
  private async upsertJob(
    job: NormalizedJob,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.prisma.externalJob.findUnique({
      where: {
        sourceName_sourceId: {
          sourceName: job.sourceName,
          sourceId: job.sourceId,
        },
      },
      select: { id: true, contentHash: true },
    });

    const jobData = {
      sourceCompanySlug: job.sourceCompanySlug,
      title: job.title,
      companyName: job.companyName,
      companyLogoUrl: job.companyLogoUrl,
      location: job.location,
      city: job.city,
      state: job.state,
      country: job.country,
      isRemote: job.isRemote,
      workplaceType: job.workplaceType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      salaryRaw: job.salaryRaw,
      descriptionHtml: job.descriptionHtml,
      descriptionPlain: job.descriptionPlain,
      descriptionSnippet: job.descriptionSnippet,
      employmentType: job.employmentType,
      department: job.department,
      team: job.team,
      extractedSkills: job.extractedSkills,
      tags: job.tags,
      experienceLevel: job.experienceLevel,
      applyUrl: job.applyUrl,
      applyType: job.applyType,
      contentHash: job.contentHash,
      urlHash: job.urlHash,
      isActive: true,
      postedAt: job.postedAt,
      expiresAt: job.expiresAt,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      if (existing.contentHash === job.contentHash) {
        await this.prisma.externalJob.update({
          where: { id: existing.id },
          data: { lastSyncedAt: new Date() },
        });
        return 'skipped';
      }

      await this.prisma.externalJob.update({
        where: { id: existing.id },
        data: jobData,
      });
      return 'updated';
    }

    await this.prisma.externalJob.create({
      data: {
        sourceName: job.sourceName,
        sourceId: job.sourceId,
        ...jobData,
      },
    });
    return 'created';
  }

  /**
   * Get circuit breaker status for monitoring.
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   * Mark jobs that haven't been seen in 45+ days as inactive.
   */
  async markExpiredJobs(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);

    const result = await this.prisma.externalJob.updateMany({
      where: {
        isActive: true,
        lastSyncedAt: { lt: cutoff },
      },
      data: { isActive: false },
    });

    this.logger.log(
      `Marked ${result.count} jobs as expired (not synced in 45+ days)`,
    );
    return result.count;
  }

  /**
   * Seed default companies from config/seed-companies.json into JobSourceConfig.
   */
  async seedDefaultSources(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const seedData = require('../config/seed-companies.json');
    let count = 0;
    for (const [sourceName, companies] of Object.entries(seedData)) {
      for (const comp of companies as Array<{ slug: string; name: string }>) {
        await this.prisma.jobSourceConfig.upsert({
          where: {
            sourceName_companySlug: {
              sourceName,
              companySlug: comp.slug,
            },
          },
          create: {
            sourceName,
            companySlug: comp.slug,
            companyName: comp.name,
            isActive: true,
          },
          update: {
            companyName: comp.name,
            isActive: true,
          },
        });
        count++;
      }
    }
    this.logger.log(
      `Seeded ${count} default job sources from seed-companies.json`,
    );
    return count;
  }
}
