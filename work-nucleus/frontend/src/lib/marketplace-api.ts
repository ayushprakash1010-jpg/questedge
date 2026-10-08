import { apiClient } from "@/lib/api";

// ── Mandate Types ────────────────────────────────────────────────

export interface Mandate {
  id: string;
  orgId: string;
  title: string;
  department?: string;
  description: string;
  requiredExperience?: string;
  mandatorySkills: string[];
  preferredSkills: string[];
  numberOfOpenings: number;
  location?: string;
  workModel?: string;
  employmentType?: string;
  compensationMin?: number;
  compensationMax?: number;
  currency: string;
  acceptsDirectApply: boolean;
  acceptsReferrals: boolean;
  participationType: string;
  referralRewardAmount?: number;
  referralRewardType?: string;
  ownershipPeriodDays: number;
  hiringManagerName?: string;
  hiringManagerTitle?: string;
  teamDescription?: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FILLED" | "CLOSED";
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string };
  _count?: { referrals: number; applications: number; participations: number };
  // Recruiter view additions
  isJoined?: boolean;
  // Candidate view additions
  isSaved?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface MandateFilters {
  q?: string;
  location?: string;
  workModel?: string;
  department?: string;
  industry?: string;
  skills?: string;
  status?: string;
  minReward?: number;
  maxReward?: number;
  page?: number;
  limit?: number;
}

export interface CreateMandatePayload {
  title: string;
  department?: string;
  description: string;
  requiredExperience?: string;
  mandatorySkills: string[];
  preferredSkills?: string[];
  numberOfOpenings?: number;
  location?: string;
  workModel?: string;
  employmentType?: string;
  compensationMin?: number;
  compensationMax?: number;
  currency?: string;
  applicationDeadline?: string;
  acceptsDirectApply?: boolean;
  acceptsReferrals?: boolean;
  participationType?: string;
  referralRewardAmount?: number;
  referralRewardType?: string;
  ownershipPeriodDays?: number;
}

// ── Company Mandate APIs ─────────────────────────────────────────

export async function createMandate(token: string, payload: CreateMandatePayload): Promise<Mandate> {
  return apiClient("/api/v1/mandates", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function getOrgMandates(token: string, filters?: MandateFilters): Promise<PaginatedResult<Mandate>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
  }
  return apiClient(`/api/v1/mandates?${params.toString()}`, { token });
}

export async function getMandate(token: string, id: string): Promise<Mandate> {
  return apiClient(`/api/v1/mandates/${id}`, { token });
}

export async function updateMandate(token: string, id: string, payload: Partial<CreateMandatePayload>): Promise<Mandate> {
  return apiClient(`/api/v1/mandates/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function publishMandate(token: string, id: string): Promise<Mandate> {
  return apiClient(`/api/v1/mandates/${id}/publish`, { method: "POST", token });
}

export async function pauseMandate(token: string, id: string): Promise<Mandate> {
  return apiClient(`/api/v1/mandates/${id}/pause`, { method: "POST", token });
}

export async function closeMandate(token: string, id: string): Promise<Mandate> {
  return apiClient(`/api/v1/mandates/${id}/close`, { method: "POST", token });
}

export async function deleteMandate(token: string, id: string): Promise<void> {
  return apiClient(`/api/v1/mandates/${id}`, { method: "DELETE", token });
}

// ── Recruiter Mandate APIs ───────────────────────────────────────

export async function discoverMandates(token: string, filters?: MandateFilters): Promise<PaginatedResult<Mandate>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
  }
  return apiClient(`/api/v1/mandates/discover?${params.toString()}`, { token });
}

export async function getMyActiveMandates(token: string): Promise<PaginatedResult<Mandate>> {
  return apiClient("/api/v1/mandates/my-active", { token });
}

export async function joinMandate(token: string, mandateId: string): Promise<any> {
  return apiClient(`/api/v1/mandates/${mandateId}/join`, { method: "POST", token });
}

export async function leaveMandate(token: string, mandateId: string): Promise<void> {
  return apiClient(`/api/v1/mandates/${mandateId}/leave`, { method: "DELETE", token });
}

// ── Recruiter Profile & Dashboard APIs ──────────────────────────

export async function getRecruiterDashboard(token: string): Promise<any> {
  return apiClient("/api/v1/recruiter/dashboard", { token });
}

export async function getRecruiterProfile(token: string): Promise<any> {
  return apiClient("/api/v1/recruiter/profile", { token });
}

export async function createRecruiterProfile(token: string, payload: any): Promise<any> {
  return apiClient("/api/v1/recruiter/profile", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function withdrawReward(token: string, rewardId: string): Promise<any> {
  return apiClient(`/api/v1/rewards/recruiter/${rewardId}/withdraw`, {
    method: "POST",
    token,
  });
}

export async function updateRecruiterProfile(token: string, payload: any): Promise<any> {
  return apiClient("/api/v1/recruiter/profile", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

// ── Candidate Portal APIs ────────────────────────────────────────

export async function getCandidateProfile(token: string): Promise<any> {
  return apiClient("/api/v1/candidate/profile", { token });
}

export async function upsertCandidateProfile(token: string, payload: any): Promise<any> {
  return apiClient("/api/v1/candidate/profile", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function parseResumeText(token: string, text: string): Promise<any> {
  return apiClient("/api/v1/candidate/profile/parse-resume", {
    method: "POST",
    token,
    body: JSON.stringify({ text }),
  });
}

export async function discoverJobs(token: string, filters?: MandateFilters): Promise<PaginatedResult<Mandate>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
  }
  return apiClient(`/api/v1/candidate/jobs?${params.toString()}`, { token });
}

export async function toggleSaveJob(token: string, mandateId: string): Promise<{ saved: boolean }> {
  return apiClient(`/api/v1/candidate/jobs/${mandateId}/save`, { method: "POST", token });
}

export async function getSavedJobs(token: string): Promise<any[]> {
  return apiClient("/api/v1/candidate/jobs/saved", { token });
}

export async function getMyApplications(token: string): Promise<any> {
  return apiClient("/api/v1/candidate/applications", { token });
}

export async function getPendingConsents(token: string): Promise<any[]> {
  return apiClient("/api/v1/candidate/consents", { token });
}

export async function respondToConsent(token: string, accepted: boolean): Promise<any> {
  return apiClient(`/api/v1/candidate/consents/${token}/respond`, {
    method: "POST",
    body: JSON.stringify({ accepted }),
  });
}

// ── Company: Referral Inbox APIs ─────────────────────────────────

export async function getMandateReferrals(token: string, mandateId: string): Promise<any[]> {
  return apiClient(`/api/v1/mandates/${mandateId}/referrals`, { token });
}

export async function updateReferralStatus(
  token: string,
  mandateId: string,
  referralId: string,
  status: string,
  notes?: string,
): Promise<any> {
  return apiClient(`/api/v1/mandates/${mandateId}/referrals/${referralId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status, notes }),
  });
}
export async function publicDiscoverMandates(filters?: MandateFilters): Promise<PaginatedResult<Mandate>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  // Public endpoint — no token required
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/v1/mandates/public?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load mandates');
  return res.json();
}

// ── Financial & Escrow APIs ──────────────────────────────────────

export async function getCompanyRewards(token: string): Promise<any[]> {
  return apiClient("/api/v1/rewards/company", { token });
}

export async function getRecruiterRewards(token: string): Promise<any> {
  return apiClient("/api/v1/rewards/recruiter", { token });
}

export async function approveReward(token: string, rewardId: string): Promise<any> {
  return apiClient(`/api/v1/rewards/company/${rewardId}/approve`, { method: "POST", token });
}

// ── Notification APIs ────────────────────────────────────────────

export async function getNotifications(token: string): Promise<any> {
  return apiClient("/api/v1/notifications", { token });
}

export async function getUnreadNotificationsCount(token: string): Promise<{ unreadCount: number }> {
  return apiClient("/api/v1/notifications/unread-count", { token });
}

export async function markNotificationsAsRead(token: string, ids: string[]): Promise<any> {
  return apiClient("/api/v1/notifications/mark-read", {
    method: "POST",
    token,
    body: JSON.stringify({ ids }),
  });
}
