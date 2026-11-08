import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IJobSourceConnector,
  RawExternalJob,
  SourceFetchResult,
} from './connector.interface';

/**
 * JSearch (via RapidAPI) connector.
 * Legally queries the Google for Jobs index which itself indexes Naukri, LinkedIn, etc.
 * Free tier: 200 requests/month. Requires RAPIDAPI_KEY env var.
 * Indian market focus.
 */
@Injectable()
export class JSearchConnector implements IJobSourceConnector {
  private readonly logger = new Logger(JSearchConnector.name);
  readonly sourceName = 'jsearch';
  readonly sourceType = 'aggregator' as const;

  private readonly BASE_URL =
    'https://jsearch.p.rapidapi.com/search';
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY', '');
  }

  async fetchJobs(slugs?: string[]): Promise<SourceFetchResult> {
    if (!this.apiKey) {
      return {
        jobs: [],
        totalFetched: 0,
        errors: ['JSearch: RAPIDAPI_KEY not configured'],
      };
    }

    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    // Queries for Indian tech market — keep under free tier quota
    const queries = [
      'software engineer India',
      'frontend developer India',
      'backend developer India',
      'data scientist Bangalore',
      'product manager India',
      'full stack developer India',
    ];

    const seenIds = new Set<string>();

    for (const query of queries) {
      try {
        const { data } = await axios.get(this.BASE_URL, {
          params: {
            query,
            page: '1',
            num_pages: '1',
            date_posted: 'week',
          },
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 15000,
        });

        const jobs = data?.data || [];
        for (const job of jobs) {
          const mapped = this.mapJob(job);
          if (!seenIds.has(mapped.sourceId)) {
            seenIds.add(mapped.sourceId);
            allJobs.push(mapped);
          }
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        const msg = `JSearch (${query}): ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
        // If 429 rate-limited, stop all further queries
        if (err.response?.status === 429) {
          errors.push('JSearch: Rate limit reached, stopping further queries');
          break;
        }
      }
    }

    this.logger.log(`JSearch fetched ${allJobs.length} jobs`);
    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(slug: string): Promise<RawExternalJob[]> {
    if (!this.apiKey) return [];

    try {
      const { data } = await axios.get(this.BASE_URL, {
        params: {
          query: `${slug} India`,
          page: '1',
          num_pages: '1',
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
        timeout: 15000,
      });

      return (data?.data || []).map((j: any) => this.mapJob(j));
    } catch (err: any) {
      this.logger.warn(`JSearch company search (${slug}): ${err.message}`);
      return [];
    }
  }

  private mapJob(job: any): RawExternalJob {
    return {
      sourceId: `js-${job.job_id || this.hashString(job.job_apply_link || job.job_title)}`,
      title: job.job_title || 'Untitled',
      companyName: job.employer_name || 'Unknown',
      companyLogoUrl: job.employer_logo || undefined,
      locationRaw: this.buildLocation(job),
      city: job.job_city || undefined,
      state: job.job_state || undefined,
      country: job.job_country || 'India',
      isRemote: job.job_is_remote || false,
      workplaceType: job.job_is_remote ? 'Remote' : 'Onsite',
      descriptionHtml: job.job_description || '',
      salaryMin: job.job_min_salary ? Number(job.job_min_salary) : undefined,
      salaryMax: job.job_max_salary ? Number(job.job_max_salary) : undefined,
      salaryCurrency: job.job_salary_currency || 'INR',
      salaryPeriod: job.job_salary_period || 'YEAR',
      employmentType: this.mapEmploymentType(job.job_employment_type),
      tags: job.job_highlights?.Qualifications?.slice(0, 10) || [],
      applyUrl: job.job_apply_link || '',
      postedAt: job.job_posted_at_datetime_utc || undefined,
      expiresAt: job.job_offer_expiration_datetime_utc || undefined,
      metadata: {
        publisher: job.job_publisher || undefined,
        googleJobId: job.job_google_link || undefined,
      },
    };
  }

  private buildLocation(job: any): string {
    const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
    return parts.join(', ') || 'Remote';
  }

  private mapEmploymentType(type?: string): string | undefined {
    if (!type) return undefined;
    const t = type.toUpperCase();
    if (t.includes('FULL')) return 'FullTime';
    if (t.includes('PART')) return 'PartTime';
    if (t.includes('CONTRACT') || t.includes('CONTRACTOR'))
      return 'Contract';
    if (t.includes('INTERN')) return 'Internship';
    return 'FullTime';
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

