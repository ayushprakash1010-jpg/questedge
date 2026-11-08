import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IJobSourceConnector,
  RawExternalJob,
  SourceFetchResult,
} from './connector.interface';

/**
 * Careerjet Affiliate Search API connector.
 * Free for publishers (sign up at http://www.careerjet.co.in/partners/api/).
 * Requires CAREERJET_AFFID env var (free publisher affiliate ID).
 * Searches the Indian job market by default (locale_code: en_IN).
 */
@Injectable()
export class CareerjetConnector implements IJobSourceConnector {
  private readonly logger = new Logger(CareerjetConnector.name);
  readonly sourceName = 'careerjet';
  readonly sourceType = 'aggregator' as const;

  private readonly BASE_URL = 'http://public.api.careerjet.net/search';
  private readonly affid: string;

  constructor(private readonly config: ConfigService) {
    this.affid = this.config.get<string>('CAREERJET_AFFID', '');
  }

  async fetchJobs(slugs?: string[]): Promise<SourceFetchResult> {
    if (!this.affid) {
      return {
        jobs: [],
        totalFetched: 0,
        errors: ['Careerjet: CAREERJET_AFFID not configured'],
      };
    }

    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    // Search for common tech roles in India
    const queries = [
      'software engineer',
      'frontend developer',
      'backend developer',
      'data scientist',
      'product manager',
      'devops engineer',
      'full stack developer',
      'react developer',
      'java developer',
      'python developer',
    ];

    const seenIds = new Set<string>();

    for (const query of queries) {
      try {
        const { data } = await axios.get(this.BASE_URL, {
          params: {
            locale_code: 'en_IN',
            keywords: query,
            location: 'India',
            affid: this.affid,
            user_ip: '0.0.0.0', // required by API, will be overridden in production
            user_agent: 'QuestEdge/1.0',
            pagesize: 20,
            page: 1,
            sort: 'date',
          },
          timeout: 10000,
        });

        const jobs = data?.jobs || [];
        for (const job of jobs) {
          const mapped = this.mapJob(job);
          if (!seenIds.has(mapped.sourceId)) {
            seenIds.add(mapped.sourceId);
            allJobs.push(mapped);
          }
        }

        // Rate limiting — wait 500ms between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        const msg = `Careerjet (${query}): ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    this.logger.log(`Careerjet fetched ${allJobs.length} jobs`);
    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(slug: string): Promise<RawExternalJob[]> {
    if (!this.affid) return [];

    try {
      const { data } = await axios.get(this.BASE_URL, {
        params: {
          locale_code: 'en_IN',
          keywords: slug,
          affid: this.affid,
          user_ip: '0.0.0.0',
          user_agent: 'QuestEdge/1.0',
          pagesize: 20,
          page: 1,
          sort: 'date',
        },
        timeout: 10000,
      });

      return (data?.jobs || []).map((j: any) => this.mapJob(j));
    } catch (err: any) {
      this.logger.warn(`Careerjet company search (${slug}): ${err.message}`);
      return [];
    }
  }

  private mapJob(job: any): RawExternalJob {
    return {
      sourceId: `cj-${this.hashString(job.url || job.title + job.company)}`,
      title: job.title || 'Untitled',
      companyName: job.company || 'Unknown',
      locationRaw: job.locations || undefined,
      city: this.extractCity(job.locations),
      isRemote: false,
      workplaceType: 'Onsite',
      descriptionPlain: job.description || '',
      salaryRaw: job.salary || undefined,
      salaryMin: job.salary_min ? Number(job.salary_min) : undefined,
      salaryMax: job.salary_max ? Number(job.salary_max) : undefined,
      salaryCurrency: job.salary_currency_code || 'INR',
      salaryPeriod: 'YEAR',
      employmentType: 'FullTime',
      applyUrl: job.url || '',
      postedAt: job.date || undefined,
    };
  }

  private extractCity(locations?: string): string | undefined {
    if (!locations) return undefined;
    return locations.split(',')[0]?.trim();
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

