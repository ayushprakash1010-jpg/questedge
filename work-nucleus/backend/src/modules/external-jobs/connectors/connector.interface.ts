export interface RawExternalJob {
  sourceId: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  companySlug?: string;
  locationRaw?: string;
  city?: string;
  state?: string;
  country?: string;
  isRemote?: boolean;
  workplaceType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryRaw?: string;
  employmentType?: string;
  department?: string;
  team?: string;
  tags?: string[];
  applyUrl: string;
  postedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface SourceFetchResult {
  jobs: RawExternalJob[];
  totalFetched: number;
  errors: string[];
}

export interface IJobSourceConnector {
  readonly sourceName: string;
  readonly sourceType: 'ats_board' | 'aggregator' | 'remote_board';
  fetchJobs(slugs?: string[]): Promise<SourceFetchResult>;
  fetchJobsForCompany(slug: string): Promise<RawExternalJob[]>;
}
