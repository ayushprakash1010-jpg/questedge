import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IJobSourceConnector, RawExternalJob, SourceFetchResult } from './connector.interface';

@Injectable()
export class RemotiveConnector implements IJobSourceConnector {
  private readonly logger = new Logger(RemotiveConnector.name);
  readonly sourceName = 'remotive';
  readonly sourceType = 'remote_board' as const;

  private readonly BASE_URL = 'https://remotive.com/api/remote-jobs';

  async fetchJobs(): Promise<SourceFetchResult> {
    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    // Fetch software-dev category (main one, avoids excessive API calls)
    try {
      const { data } = await axios.get(this.BASE_URL, {
        params: { category: 'software-dev', limit: 50 },
        timeout: 15000,
      });

      const jobs = data?.jobs || [];
      for (const job of jobs) {
        const loc = (job.candidate_required_location || '').toLowerCase();
        if (
          loc.includes('worldwide') ||
          loc.includes('india') ||
          loc.includes('asia') ||
          loc.includes('anywhere') ||
          loc === ''
        ) {
          allJobs.push(this.mapJob(job));
        }
      }
    } catch (err: any) {
      const msg = `Remotive: ${err.message}`;
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
    return {
      sourceId: String(job.id),
      title: job.title || 'Untitled',
      companyName: job.company_name || 'Unknown',
      companyLogoUrl: job.company_logo_url || job.company_logo || undefined,
      locationRaw: job.candidate_required_location || 'Worldwide',
      isRemote: true,
      workplaceType: 'Remote',
      descriptionHtml: job.description || '',
      salaryRaw: job.salary || undefined,
      employmentType: this.mapJobType(job.job_type),
      department: job.category || undefined,
      tags: (job.tags || []).filter(Boolean),
      applyUrl: job.url || '',
      postedAt: job.publication_date || undefined,
    };
  }

  private mapJobType(type: string | undefined): string | undefined {
    if (!type) return undefined;
    const lower = type.toLowerCase();
    if (lower.includes('full')) return 'FullTime';
    if (lower.includes('part')) return 'PartTime';
    if (lower.includes('contract') || lower.includes('freelance')) return 'Contract';
    if (lower.includes('intern')) return 'Internship';
    return 'FullTime';
  }
}

