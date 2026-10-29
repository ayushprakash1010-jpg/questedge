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

export async function fillMandate(token: string, id: string): Promise<Mandate> {
  return apiClient(`/api/v1/mandates/${id}/fill`, { method: "POST", token });
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

export async function applyDirectly(
  mandateId: string,
  token: string,
  coverLetter?: string
): Promise<any> {
  return apiClient(`/api/v1/candidate/jobs/${mandateId}/apply`, {
    method: "POST",
    token,
    body: JSON.stringify({ coverLetter: coverLetter || "" }),
  });
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

// ── Privacy & Data-Subject Rights (GDPR / DPDP) ───────────────────

export async function exportCandidateData(token: string): Promise<any> {
  return apiClient("/api/v1/candidate/privacy/export", { token });
}

export async function eraseCandidateData(token: string): Promise<{ success: boolean; message: string; erasedAt: string }> {
  return apiClient("/api/v1/candidate/privacy/erasure", { method: "POST", token });
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

// ── P4-01: Verification & Trust Profile APIs ─────────────────────

export interface TrustScoreBreakdown {
  placements: { score: number; weight: number; hiredCount: number };
  tenure: { score: number; weight: number; months: number };
  consentRate: { score: number; weight: number; rate: number };
  verified: { score: number; weight: number; isVerified: boolean };
  profileCompleteness: { score: number; weight: number; pct: number };
}

export interface TrustProfile {
  id: string;
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  specializations: string[];
  experienceYears: number | null;
  linkedinUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  trustScore: number;
  trustTier: 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  trustBreakdown: TrustScoreBreakdown;
  reputationTier: string;
  hiredCount: number;
}

export async function submitVerificationRequest(
  token: string,
  payload: {
    statement: string;
    linkedinUrl?: string;
    companyName?: string;
    certifications?: string[];
    evidenceUrls?: string[];
  },
): Promise<any> {
  return apiClient('/api/v1/recruiter/verification-request', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function getMyTrustProfile(token: string): Promise<TrustProfile> {
  return apiClient('/api/v1/recruiter/trust-profile', { token });
}

export async function getRecruiterTrustProfile(
  token: string,
  recruiterId: string,
): Promise<TrustProfile> {
  return apiClient(`/api/v1/recruiter/${recruiterId}/trust-profile`, { token });
}

// ── P4-05: Reward Disputes & Immutable Audit Trail APIs ──────────

export interface DisputePayload {
  reason: 'OWNERSHIP_CONFLICT' | 'CLAWBACK_EARLY_EXIT' | 'SALARY_MISMATCH' | 'FRAUDULENT_SUBMISSION' | 'OTHER';
  details: string;
  evidenceUrls?: string[];
}

export interface DisputeResolutionPayload {
  decision: 'UPHELD' | 'REJECTED' | 'SETTLED';
  resolutionNotes: string;
  settlementAmount?: number;
}

export async function raiseRewardDispute(
  token: string,
  rewardId: string,
  payload: DisputePayload,
): Promise<any> {
  return apiClient(`/api/v1/rewards/${rewardId}/dispute`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function resolveRewardDispute(
  token: string,
  rewardId: string,
  payload: DisputeResolutionPayload,
): Promise<any> {
  return apiClient(`/api/v1/rewards/${rewardId}/resolve-dispute`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function getRewardAuditTrail(
  token: string,
  rewardId: string,
): Promise<any> {
  return apiClient(`/api/v1/rewards/${rewardId}/audit-trail`, { token });
}

export async function getDisputedRewards(
  token: string,
  limit = 20,
): Promise<any> {
  return apiClient(`/api/v1/rewards/disputes?limit=${limit}`, { token });
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

// ── AI Matching Types & APIs (P5-03) ─────────────────────────────

export interface MatchScoreBreakdown {
  skillsFit: number;
  experienceFit: number;
  roleDomainFit: number;
  preferencesFit: number;
}

export type MatchVerdict = 'STRONG_MATCH' | 'GOOD_MATCH' | 'POTENTIAL_MATCH' | 'LOW_FIT';

export interface MatchEvaluationResult {
  matchScore: number;
  verdict: MatchVerdict;
  scoreBreakdown: MatchScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  aiSummary: string;
  evaluatedAt: string;
  isAiGenerated: boolean;
}

export interface MandateMatchItem {
  mandate: Mandate;
  match: MatchEvaluationResult;
}

export interface CandidateMatchItem {
  candidate: {
    id: string;
    name: string;
    email: string;
    headline: string | null;
    currentDesignation: string | null;
    currentCompany: string | null;
    experienceYears: number | null;
    skills: string[];
    currentLocation: string | null;
    workModel: string | null;
    noticePeriodDays: number | null;
  };
  match: MatchEvaluationResult;
}

export interface PreflightCheckPayload {
  mandateId: string;
  candidateProfileId?: string;
  candidateName?: string;
  candidateEmail?: string;
  headline?: string;
  skills?: string[];
  experienceYears?: number;
  expectedCtc?: number;
  noticePeriodDays?: number;
  currentLocation?: string;
  workModel?: string;
}

export async function getCandidateMandateMatch(
  token: string,
  mandateId: string,
): Promise<MatchEvaluationResult> {
  return apiClient(`/api/v1/ai-matching/candidate/mandate/${mandateId}`, { token });
}

export async function getCandidateRecommendations(
  token: string,
  limit = 10,
): Promise<MandateMatchItem[]> {
  return apiClient(`/api/v1/ai-matching/candidate/recommendations?limit=${limit}`, { token });
}

export async function getRecruiterTalentPoolMatches(
  token: string,
  mandateId: string,
  limit = 10,
): Promise<CandidateMatchItem[]> {
  return apiClient(
    `/api/v1/ai-matching/recruiter/mandate/${mandateId}/talent-pool?limit=${limit}`,
    { token },
  );
}

export async function runPreflightMatchCheck(
  token: string,
  payload: PreflightCheckPayload,
): Promise<MatchEvaluationResult> {
  return apiClient('/api/v1/ai-matching/preflight-check', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function syncReferralMatch(
  token: string,
  referralId: string,
): Promise<any> {
  return apiClient(`/api/v1/ai-matching/referral/${referralId}/sync`, {
    method: 'POST',
    token,
  });
}

