import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IJobSourceConnector, RawExternalJob, SourceFetchResult } from './connector.interface';

@Injectable()
export class JobicyConnector implements IJobSourceConnector {
  private readonly logger = new Logger(JobicyConnector.name);
  readonly sourceName = 'jobicy';
  readonly sourceType = 'remote_board' as const;

  private readonly BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';

  async fetchJobs(): Promise<SourceFetchResult> {
    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    try {
      const { data } = await axios.get(this.BASE_URL, {
        params: { count: 50, geo: 'apac' },
        timeout: 15000,
      });
      const jobs = data?.jobs || [];
      for (const job of jobs) {
        allJobs.push(this.mapJob(job));
      }
    } catch (err: any) {
      const msg = `Jobicy: ${err.message}`;
      this.logger.warn(msg);
      errors.push(msg);
    }

    try {
      const { data } = await axios.get(this.BASE_URL, {
        params: { count: 50, geo: 'anywhere' },
        timeout: 15000,
      });
      const jobs = data?.jobs || [];
      for (const job of jobs) {
        if (!allJobs.some((j) => j.sourceId === String(job.id))) {
          allJobs.push(this.mapJob(job));
        }
      }
    } catch (err: any) {
      errors.push(`Jobicy (worldwide): ${err.message}`);
    }

    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(): Promise<RawExternalJob[]> {
    const result = await this.fetchJobs();
    return result.jobs;
  }

  private mapJob(job: any): RawExternalJob {
    return {
      sourceId: String(job.id || job.url),
      title: job.jobTitle || 'Untitled',
      companyName: job.companyName || 'Unknown',
      companyLogoUrl: job.companyLogo || undefined,
      locationRaw: `Remote (${job.jobGeo || 'Worldwide'})`,
      isRemote: true,
      workplaceType: 'Remote',
      descriptionHtml: job.jobDescription || '',
      salaryMin: job.annualSalaryMin ? Number(job.annualSalaryMin) : undefined,
      salaryMax: job.annualSalaryMax ? Number(job.annualSalaryMax) : undefined,
      salaryCurrency: job.salaryCurrency || 'USD',
      salaryPeriod: 'YEAR',
      employmentType: this.mapJobType(job.jobType),
      department: job.jobIndustry?.[0] || undefined,
      tags: [...(job.jobIndustry || []), ...(job.jobType || [])].filter(Boolean),
      applyUrl: job.url || '',
      postedAt: job.pubDate || undefined,
    };
  }

  private mapJobType(types: string[] | undefined): string | undefined {
    if (!types || !types.length) return undefined;
    const first = types[0].toLowerCase();
    if (first.includes('full')) return 'FullTime';
    if (first.includes('part')) return 'PartTime';
    if (first.includes('contract')) return 'Contract';
    if (first.includes('intern')) return 'Internship';
    return 'FullTime';
  }
}

