import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IJobSourceConnector, RawExternalJob, SourceFetchResult } from './connector.interface';

@Injectable()
export class RemoteOKConnector implements IJobSourceConnector {
  private readonly logger = new Logger(RemoteOKConnector.name);
  readonly sourceName = 'remoteok';
  readonly sourceType = 'remote_board' as const;

  private readonly BASE_URL = 'https://remoteok.com/api';

  async fetchJobs(): Promise<SourceFetchResult> {
    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    try {
      const { data } = await axios.get(this.BASE_URL, {
        headers: {
          'User-Agent':
            'QuestEdge/1.0 (https://questedge.vercel.app; job-aggregation)',
        },
        timeout: 15000,
      });

      if (!Array.isArray(data)) {
        errors.push('RemoteOK: Unexpected response format');
        return { jobs: allJobs, totalFetched: 0, errors };
      }

      // First element is a legal notice, skip it
      for (let i = 1; i < data.length; i++) {
        const job = data[i];
        if (job && job.position) {
          allJobs.push(this.mapJob(job));
        }
      }
    } catch (err: any) {
      const msg = `RemoteOK: ${err.message}`;
      this.logger.warn(msg);
      errors.push(msg);
    }

    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(): Promise<RawExternalJob[]> {
    const result = await this.fetchJobs();
    return result.jobs;
  }

  private mapJob(job: any): RawExternalJob {
    const tags = Array.isArray(job.tags) ? job.tags : [];

    return {
      sourceId: String(job.id || job.slug),
      title: job.position || 'Untitled',
      companyName: job.company || 'Unknown',
      companyLogoUrl: job.company_logo || job.logo || undefined,
      locationRaw: job.location || 'Worldwide',
      isRemote: true,
      workplaceType: 'Remote',
      descriptionHtml: job.description || '',
      salaryMin: job.salary_min ? Number(job.salary_min) : undefined,
      salaryMax: job.salary_max ? Number(job.salary_max) : undefined,
      salaryCurrency: 'USD',
      salaryPeriod: 'YEAR',
      tags,
      applyUrl: job.apply_url || job.url || '',
      postedAt: job.date ? new Date(job.date).toISOString() : undefined,
    };
  }
}

