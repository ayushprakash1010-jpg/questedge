import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IJobSourceConnector, RawExternalJob, SourceFetchResult } from './connector.interface';

@Injectable()
export class LeverConnector implements IJobSourceConnector {
  private readonly logger = new Logger(LeverConnector.name);
  readonly sourceName = 'lever';
  readonly sourceType = 'ats_board' as const;

  private readonly BASE_URL = 'https://api.lever.co/v0/postings';

  async fetchJobs(slugs: string[]): Promise<SourceFetchResult> {
    const allJobs: RawExternalJob[] = [];
    const errors: string[] = [];

    for (const slug of slugs) {
      try {
        const jobs = await this.fetchJobsForCompany(slug);
        allJobs.push(...jobs);
        await this.delay(500);
      } catch (err: any) {
        const msg = `Lever [${slug}]: ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    return { jobs: allJobs, totalFetched: allJobs.length, errors };
  }

  async fetchJobsForCompany(slug: string): Promise<RawExternalJob[]> {
    const url = `${this.BASE_URL}/${slug}?mode=json`;
    const { data } = await axios.get(url, { timeout: 15000 });

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((job: any) => this.mapJob(job, slug));
  }

  private mapJob(job: any, slug: string): RawExternalJob {
    const location = job.categories?.location || '';
    const commitment = job.categories?.commitment || '';
    const isRemote = /remote/i.test(location) || /remote/i.test(commitment);

    return {
      sourceId: job.id,
      title: job.text || 'Untitled',
      companyName: slug,
      companySlug: slug,
      locationRaw: location,
      isRemote,
      workplaceType: isRemote ? 'Remote' : 'OnSite',
      descriptionHtml: job.descriptionPlain || job.description || '',
      descriptionPlain: job.descriptionPlain || '',
      department: job.categories?.department || job.categories?.team || undefined,
      team: job.categories?.team || undefined,
      employmentType: this.mapCommitment(commitment),
      applyUrl: job.applyUrl || job.hostedUrl || `https://jobs.lever.co/${slug}/${job.id}`,
      postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
      tags: [job.categories?.department, job.categories?.team, job.categories?.commitment]
        .filter(Boolean) as string[],
    };
  }

  private mapCommitment(commitment: string): string | undefined {
    const lower = (commitment || '').toLowerCase();
    if (lower.includes('full')) return 'FullTime';
    if (lower.includes('part')) return 'PartTime';
    if (lower.includes('contract') || lower.includes('freelance')) return 'Contract';
    if (lower.includes('intern')) return 'Internship';
    return undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
