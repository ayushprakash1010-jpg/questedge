import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
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
import { SEED_COMPANIES } from '../config/seed-companies';
import { isSafePublicUrl } from './url-safety.util';

export interface SyncResult {
  source: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  deactivated?: number;
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

      // ── Delta Deactivation Safeguard ──────────────────────────────
      // Group fetched job sourceIds by companySlug
      const activeIdsBySlug = new Map<string, string[]>();
      for (const rawJob of result.jobs) {
        const slug = rawJob.companySlug;
        if (slug) {
          if (!activeIdsBySlug.has(slug)) activeIdsBySlug.set(slug, []);
          activeIdsBySlug.get(slug)!.push(rawJob.sourceId);
        }
      }

      let totalDeactivated = 0;
      for (const slug of slugs) {
        // FAIL-SAFE 1: If there was an error fetching this company's feed, DO NOT deactivate anything.
        const slugError = result.errors.some((err) =>
          err.toLowerCase().includes(`[${slug.toLowerCase()}]`),
        );
        if (slugError) {
          this.logger.warn(
            `[Delta Deactivation] Skipping ${sourceName}/${slug} — fetch had errors`,
          );
          continue;
        }

        const currentActiveIds = activeIdsBySlug.get(slug);

        // FAIL-SAFE 2: Only deactivate if company explicitly returned active jobs.
        // If an ATS returned 0 jobs unexpectedly, do NOT purge the company catalog immediately;
        // let the daily expiry worker handle long-term stale jobs to avoid purging on empty transient feeds.
        if (currentActiveIds && currentActiveIds.length > 0) {
          try {
            const deactResult = await this.prisma.externalJob.updateMany({
              where: {
                sourceName,
                sourceCompanySlug: slug,
                isActive: true,
                sourceId: { notIn: currentActiveIds },
              },
              data: { isActive: false },
            });

            if (deactResult.count > 0) {
              totalDeactivated += deactResult.count;
              this.logger.log(
                `[Delta Deactivation] Marked ${deactResult.count} closed jobs as inactive for ${sourceName}/${slug}`,
              );
            }
          } catch (deactErr: any) {
            this.logger.warn(
              `[Delta Deactivation] Error updating ${sourceName}/${slug}: ${deactErr.message}`,
            );
          }
        }
      }
      syncResult.deactivated = totalDeactivated;

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
      requiredExperience: job.requiredExperience ?? null,
      applyUrl: job.applyUrl,
      applyType: job.applyType,
      contentHash: job.contentHash,
      urlHash: job.urlHash,
      isActive: true,
      postedAt: job.postedAt ?? null,
      expiresAt: job.expiresAt,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      if (existing.contentHash === job.contentHash) {
        await this.prisma.externalJob.update({
          where: { id: existing.id },
          data: {
            lastSyncedAt: new Date(),
            requiredExperience: job.requiredExperience ?? null,
            postedAt: job.postedAt ?? null,
            isActive: true,
          },
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
   * Safe URL Health-Check Probe:
   * Verifies a batch of active job URLs.
   * Only deactivates if HTTP 404 or 410 is explicitly received.
   * Any timeouts, 403 (Cloudflare/bot protection), 429, or 5xx server errors
   * NEVER cause deactivation.
   */
  async verifyJobUrls(
    batchSize = 25,
  ): Promise<{ checked: number; deactivated: number; verified: number }> {
    const jobs = await this.prisma.externalJob.findMany({
      where: { isActive: true },
      orderBy: [
        { lastVerifiedAt: { sort: 'asc', nulls: 'first' } },
        { postedAt: 'desc' },
      ],
      take: batchSize,
      select: { id: true, applyUrl: true, sourceName: true, companyName: true },
    });

    if (jobs.length === 0) {
      return { checked: 0, deactivated: 0, verified: 0 };
    }

    let deactivated = 0;
    let verified = 0;

    for (const job of jobs) {
      try {
        if (!isSafePublicUrl(job.applyUrl)) {
          this.logger.warn(
            `[SSRF Prevention] Skipped unsafe job applyUrl for ${job.id}: ${job.applyUrl}`,
          );
          continue;
        }

        const response = await axios.get(job.applyUrl, {
          timeout: 6000,
          maxRedirects: 3,
          beforeRedirect: (options: any) => {
            const redirectUrl =
              options.href ||
              `${options.protocol || 'http:'}//${options.host}${options.path || ''}`;
            if (!isSafePublicUrl(redirectUrl)) {
              throw new Error(`SSRF Prevention: Blocked redirect to ${redirectUrl}`);
            }
          },
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          validateStatus: () => true, // Don't throw on non-2xx so we inspect exact status
        });

        // ONLY HTTP 404 (Not Found) or 410 (Gone) confirms the job posting was removed
        if (response.status === 404 || response.status === 410) {
          await this.prisma.externalJob.update({
            where: { id: job.id },
            data: { isActive: false, lastVerifiedAt: new Date() },
          });
          deactivated++;
          this.logger.log(
            `[URL Health-Check] Deactivated job ${job.id} (${job.companyName}) — returned HTTP ${response.status}`,
          );
        } else {
          // Status 200, 301, 302, or 403/429/503 -> Keep active, update lastVerifiedAt
          await this.prisma.externalJob.update({
            where: { id: job.id },
            data: { lastVerifiedAt: new Date() },
          });
          verified++;
        }
      } catch (err: any) {
        // Network timeout / DNS issue: NEVER deactivate on network errors
        await this.prisma.externalJob.update({
          where: { id: job.id },
          data: { lastVerifiedAt: new Date() },
        });
        verified++;
      }
    }

    this.logger.log(
      `[URL Health-Check] Checked ${jobs.length} jobs: ${verified} verified active, ${deactivated} confirmed dead (404/410)`,
    );

    return { checked: jobs.length, deactivated, verified };
  }

  /**
   * Seed default companies into JobSourceConfig.
   */
  async seedDefaultSources(): Promise<number> {
    let count = 0;
    for (const [sourceName, companies] of Object.entries(SEED_COMPANIES)) {
      for (const comp of companies) {
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
      `Seeded ${count} default job sources into JobSourceConfig`,
    );
    return count;
  }
}
