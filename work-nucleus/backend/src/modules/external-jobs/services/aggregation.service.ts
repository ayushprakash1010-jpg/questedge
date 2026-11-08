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

    const configs = await this.prisma.jobSourceConfig.findMany({
      where: { isActive: true },
    });

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

      const start = Date.now();
      const result = await connector.fetchJobs(slugs);

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
      const start = Date.now();
      const result = await connector.fetchJobs();

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
      const start = Date.now();
      const result = await connector.fetchJobs();

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
}
