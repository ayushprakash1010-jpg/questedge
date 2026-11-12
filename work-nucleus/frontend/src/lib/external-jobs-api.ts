import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────

export interface ExternalJob {
  id: string;
  sourceName: string;
  sourceId: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isRemote: boolean;
  workplaceType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  salaryRaw?: string | null;
  descriptionSnippet?: string | null;
  descriptionHtml?: string | null;
  descriptionPlain?: string | null;
  employmentType?: string | null;
  department?: string | null;
  extractedSkills?: string[] | null;
  tags?: string[] | null;
  experienceLevel?: string | null;
  requiredExperience?: string | null;
  applyUrl: string;
  postedAt?: string | null;
  createdAt?: string;
  // Enrichments (from search with auth)
  matchScore?: number | null;
  matchedSkills?: string[] | null;
  // Detail enrichments
  matchData?: ExternalJobMatchData | null;
  isSaved?: boolean;
}

export interface ExternalJobMatchData {
  totalScore: number;
  skillsScore: number;
  experienceScore: number;
  roleFitScore: number;
  preferencesScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ExternalJobSearchParams {
  search?: string;
  location?: string;
  workplaceType?: string;
  experienceLevel?: string;
  employmentType?: string;
  sourceName?: string;
  salaryMin?: number;
  salaryMax?: number;
  postedWithin?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface ExternalJobsResponse {
  jobs: ExternalJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
}

export interface RecommendedJob extends ExternalJob {
  matchScore: number;
  skillsScore: number;
  experienceScore: number;
  roleFitScore: number;
  preferencesScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

// ── API Functions ──────────────────────────────────────────────────

export async function searchExternalJobs(
  token: string,
  params: ExternalJobSearchParams,
): Promise<ExternalJobsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      query.set(key, String(value));
    }
  });
  return apiClient<ExternalJobsResponse>(
    `/api/v1/external-jobs?${query.toString()}`,
    { token },
  );
}

export async function getExternalJobById(
  token: string,
  id: string,
): Promise<ExternalJob> {
  return apiClient<ExternalJob>(`/api/v1/external-jobs/${id}`, { token });
}

export async function getRecommendedExternalJobs(
  token: string,
): Promise<{ jobs: RecommendedJob[] }> {
  return apiClient<{ jobs: RecommendedJob[] }>(
    '/api/v1/external-jobs/recommended',
    { token },
  );
}

export async function getSavedExternalJobs(
  token: string,
  page = 1,
  limit = 20,
): Promise<{
  savedJobs: ExternalJob[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  return apiClient(
    `/api/v1/external-jobs/saved?page=${page}&limit=${limit}`,
    { token },
  );
}

export async function toggleExternalJobSave(
  token: string,
  jobId: string,
): Promise<{ saved: boolean }> {
  return apiClient<{ saved: boolean }>(
    `/api/v1/external-jobs/${jobId}/save`,
    { token, method: 'POST' },
  );
}

export async function recordExternalJobClick(
  token: string,
  jobId: string,
): Promise<{ applyUrl: string }> {
  return apiClient<{ applyUrl: string }>(
    `/api/v1/external-jobs/${jobId}/click`,
    { token, method: 'POST' },
  );
}

export async function reportExternalJobApplied(
  token: string,
  jobId: string,
): Promise<{ reported: boolean }> {
  return apiClient<{ reported: boolean }>(
    `/api/v1/external-jobs/${jobId}/applied`,
    { token, method: 'PATCH' },
  );
}

export async function getExternalJobClickHistory(
  token: string,
  page = 1,
  limit = 20,
): Promise<{
  history: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  return apiClient(
    `/api/v1/external-jobs/history?page=${page}&limit=${limit}`,
    { token },
  );
}

export async function triggerExternalJobsSync(
  token: string,
): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(
    `/api/v1/external-jobs/sync`,
    { token, method: 'POST' },
  );
}

