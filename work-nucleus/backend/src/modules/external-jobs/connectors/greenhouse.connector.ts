import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IJobSourceConnector, RawExternalJob, SourceFetchResult } from './connector.interface';

@Injectable()
export class GreenhouseConnector implements IJobSourceConnector {
  private readonly logger = new Logger(GreenhouseConnector.name);
  readonly sourceName = 'greenhouse';
  readonly sourceType = 'ats_board' as const;

  private readonly BASE_URL = 'https://boards-api.greenhouse.io/v1/boards';

  async fetchJobs(slugs: string[]): Promise<SourceFetchResult> {
    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    for (const slug of slugs) {
      try {
        const jobs = await this.fetchJobsForCompany(slug);
        allJobs.push(...jobs);
        // Polite crawling: 500ms delay between companies
        await this.delay(500);
      } catch (err: any) {
        const msg = `Greenhouse [${slug}]: ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(slug: string): Promise<RawExternalJob[]> {
    const url = `${this.BASE_URL}/${slug}/jobs?content=true`;
    const { data } = await axios.get(url, { timeout: 15000 });

    if (!data?.jobs || !Array.isArray(data.jobs)) {
      return [];
    }

    return data.jobs.map((job: any) => this.mapJob(job, slug));
  }

  private mapJob(job: any, slug: string): RawExternalJob {
    const location = job.location?.name || '';
    const isRemote = /remote/i.test(location);

    return {
      sourceId: String(job.id),
      title: job.title || 'Untitled',
      companyName: slug,
      companySlug: slug,
      locationRaw: location,
      isRemote,
      workplaceType: isRemote ? 'Remote' : 'OnSite',
      descriptionHtml: job.content || '',
      department: job.departments?.[0]?.name || undefined,
      applyUrl: job.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${job.id}`,
      // updated_at is the last edit time, not when the role was first published.
      // Only use Greenhouse's publication timestamp when the board provides it.
      postedAt: job.first_published || undefined,
      tags: (job.departments || []).map((d: any) => d.name).filter(Boolean),
      metadata: {
        offices: job.offices?.map((o: any) => o.name) || [],
        internalJobId: job.internal_job_id,
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
