import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IJobSourceConnector, RawExternalJob, SourceFetchResult } from './connector.interface';

@Injectable()
export class AshbyConnector implements IJobSourceConnector {
  private readonly logger = new Logger(AshbyConnector.name);
  readonly sourceName = 'ashby';
  readonly sourceType = 'ats_board' as const;

  private readonly BASE_URL = 'https://api.ashbyhq.com/posting-api/job-board';

  async fetchJobs(slugs: string[]): Promise<SourceFetchResult> {
    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    for (const slug of slugs) {
      try {
        const jobs = await this.fetchJobsForCompany(slug);
        allJobs.push(...jobs);
        await this.delay(500);
      } catch (err: any) {
        const msg = `Ashby [${slug}]: ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(slug: string): Promise<RawExternalJob[]> {
    const url = `${this.BASE_URL}/${slug}?includeCompensation=true`;
    const { data } = await axios.get(url, { timeout: 15000 });

    if (!data?.jobs || !Array.isArray(data.jobs)) {
      return [];
    }

    return data.jobs
      .filter((job: any) => job.isListed !== false)
      .map((job: any) => this.mapJob(job, slug));
  }

  private mapJob(job: any, slug: string): RawExternalJob {
    const location = job.location || job.primaryLocation?.city || '';
    const isRemote = job.isRemote === true || /remote/i.test(location);

    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    let salaryCurrency: string | undefined;
    let salaryRaw: string | undefined;

    if (job.compensationTierSummary) {
      salaryRaw = job.compensationTierSummary;
      const match = job.compensationTierSummary.match(
        /([A-Z]{3})?\s*[\$₹€£]?\s*([\d,]+)\s*[-–to]+\s*[\$₹€£]?\s*([\d,]+)/i
      );
      if (match) {
        salaryCurrency = match[1] || 'USD';
        salaryMin = parseInt(match[2].replace(/,/g, ''), 10);
        salaryMax = parseInt(match[3].replace(/,/g, ''), 10);
      }
    }

    let workplaceType = 'OnSite';
    if (job.workplaceType) {
      workplaceType = job.workplaceType;
    } else if (isRemote) {
      workplaceType = 'Remote';
    }

    return {
      sourceId: job.id,
      title: job.title || 'Untitled',
      companyName: slug,
      companySlug: slug,
      locationRaw: location,
      city: job.primaryLocation?.city || undefined,
      state: job.primaryLocation?.region || undefined,
      country: job.primaryLocation?.country || undefined,
      isRemote,
      workplaceType,
      descriptionHtml: job.descriptionHtml || '',
      descriptionPlain: job.descriptionPlain || '',
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryRaw,
      employmentType: job.employmentType || undefined,
      department: job.department || undefined,
      team: job.team || undefined,
      applyUrl: job.applyUrl || job.jobUrl || `https://jobs.ashbyhq.com/${slug}/${job.id}`,
      postedAt: job.publishedAt || undefined,
      tags: [job.department, job.team].filter(Boolean) as string[],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
