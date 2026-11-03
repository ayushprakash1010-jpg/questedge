// API client functions for QuestEdge In-Platform Assessment Engine

export type AssessmentType = 'QUIZ' | 'CODING' | 'VIDEO_INTERVIEW';
export type QuestionType = 'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SUBJECTIVE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'TIMED_OUT' | 'ABANDONED';
export type CodeSubmissionStatus = 'RUNNING' | 'PASSED' | 'PARTIAL' | 'FAILED' | 'ERROR' | 'TIMEOUT';
export type VideoInterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  text: string;
  options: Array<{ id: string; text: string; isCorrect?: boolean }>;
  type: QuestionType;
  category?: string;
  difficulty: Difficulty;
  explanation?: string;
  points: number;
  tags: string[];
  orderIndex: number;
}

export interface CodingChallenge {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  constraints?: string;
  sampleTestCases: Array<{ id: string; input: string; expectedOutput: string }>;
  hiddenTestCases?: Array<{ id: string; input: string; expectedOutput: string; points: number }>;
  supportedLanguages: string[];
  starterCode: Record<string, string>;
  difficulty: Difficulty;
  maxScore: number;
  timeLimitSeconds: number;
  orderIndex: number;
}

export interface HiringAssessment {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  type: AssessmentType;
  durationMinutes: number;
  totalPoints: number;
  passingPercentage: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  isActive: boolean;
  instructions?: string;
  mandateId?: string;
  mandate?: { id: string; title: string };
  pipelineStageId?: string;
  pipelineStage?: { id: string; name: string };
  questions?: AssessmentQuestion[];
  codingChallenges?: CodingChallenge[];
  _count?: {
    questions: number;
    codingChallenges: number;
    attempts: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  candidateId?: string;
  applicationId?: string;
  accessToken: string;
  expiresAt: string;
  status: AttemptStatus;
  startedAt?: string;
  completedAt?: string;
  score: number;
  percentage: number;
  passed?: boolean;
  tabSwitchCount: number;
  fullscreenExits: number;
  assessment: HiringAssessment;
  candidateProfile?: {
    id: string;
    name: string;
    email: string;
  };
  responses?: any[];
  codeSubmissions?: any[];
}

export interface VideoInterview {
  id: string;
  orgId: string;
  roomName: string;
  candidateId?: string;
  candidateProfile?: { id: string; name: string; email: string; resumeUrl?: string };
  applicationId?: string;
  application?: { id: string; aiMatchScore?: number; aiMatchSummary?: string };
  interviewerId: string;
  interviewer?: { id: string; name: string; email: string };
  pipelineStageId?: string;
  pipelineStage?: { id: string; name: string };
  mandateId?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: VideoInterviewStatus;
  candidateAccessToken: string;
  technicalScore?: number;
  communicationScore?: number;
  cultureFitScore?: number;
  leadershipScore?: number;
  overallRating?: number;
  recommendation?: string;
  notes?: string;
  strengths?: string;
  weaknesses?: string;
}

// ── Helpers ───────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ── Company / Admin Assessment APIs ───────────────────────────────

export async function fetchAssessments(params?: { type?: string; mandateId?: string }): Promise<HiringAssessment[]> {
  const query = new URLSearchParams();
  if (params?.type) query.set('type', params.type);
  if (params?.mandateId) query.set('mandateId', params.mandateId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`/api/v2/assessments${qStr}`);
  return handleResponse<HiringAssessment[]>(res);
}

export async function fetchAssessment(id: string): Promise<HiringAssessment> {
  const res = await fetch(`/api/v2/assessments/${id}`);
  return handleResponse<HiringAssessment>(res);
}

export async function createAssessment(data: Partial<HiringAssessment>): Promise<HiringAssessment> {
  const res = await fetch('/api/v2/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<HiringAssessment>(res);
}

export async function updateAssessment(id: string, data: Partial<HiringAssessment>): Promise<HiringAssessment> {
  const res = await fetch(`/api/v2/assessments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<HiringAssessment>(res);
}

export async function deleteAssessment(id: string): Promise<void> {
  const res = await fetch(`/api/v2/assessments/${id}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

// ── Question Management ──────────────────────────────────────────

export async function addAssessmentQuestion(assessmentId: string, data: Partial<AssessmentQuestion>): Promise<AssessmentQuestion> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AssessmentQuestion>(res);
}

export async function updateAssessmentQuestion(assessmentId: string, questionId: string, data: Partial<AssessmentQuestion>): Promise<AssessmentQuestion> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/questions/${questionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AssessmentQuestion>(res);
}

export async function deleteAssessmentQuestion(assessmentId: string, questionId: string): Promise<void> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/questions/${questionId}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

// ── Coding Challenge Management ──────────────────────────────────

export async function addCodingChallenge(assessmentId: string, data: Partial<CodingChallenge>): Promise<CodingChallenge> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/challenges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<CodingChallenge>(res);
}

export async function updateCodingChallenge(assessmentId: string, challengeId: string, data: Partial<CodingChallenge>): Promise<CodingChallenge> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/challenges/${challengeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<CodingChallenge>(res);
}

export async function deleteCodingChallenge(assessmentId: string, challengeId: string): Promise<void> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/challenges/${challengeId}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

// ── Invites & Analytics ──────────────────────────────────────────

export async function sendAssessmentInvite(
  assessmentId: string,
  data: { candidateId: string; applicationId?: string }
): Promise<AssessmentAttempt> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AssessmentAttempt>(res);
}

export async function fetchAssessmentAnalytics(assessmentId: string): Promise<{
  totalAttempts: number;
  passed: number;
  failed: number;
  passRate: string;
  averageScore: number;
  averagePercentage: string;
  attempts: any[];
}> {
  const res = await fetch(`/api/v2/assessments/${assessmentId}/analytics`);
  return handleResponse(res);
}

export async function fetchAttemptResults(attemptId: string): Promise<any> {
  const res = await fetch(`/api/v2/assessments/attempts/${attemptId}/results`);
  return handleResponse(res);
}

// ── Video Interviews ─────────────────────────────────────────────

export async function scheduleVideoInterview(data: {
  candidateId?: string;
  applicationId?: string;
  interviewerId: string;
  pipelineStageId?: string;
  mandateId?: string;
  scheduledAt: string;
}): Promise<VideoInterview> {
  const res = await fetch('/api/v2/assessments/video-interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<VideoInterview>(res);
}

export async function fetchVideoInterviews(params?: { mandateId?: string; status?: string }): Promise<VideoInterview[]> {
  const query = new URLSearchParams();
  if (params?.mandateId) query.set('mandateId', params.mandateId);
  if (params?.status) query.set('status', params.status);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`/api/v2/assessments/video-interviews${qStr}`);
  return handleResponse<VideoInterview[]>(res);
}

export async function fetchVideoInterview(id: string): Promise<VideoInterview> {
  const res = await fetch(`/api/v2/assessments/video-interviews/${id}`);
  return handleResponse<VideoInterview>(res);
}

export async function startVideoInterview(id: string): Promise<VideoInterview> {
  const res = await fetch(`/api/v2/assessments/video-interviews/${id}/start`, { method: 'PATCH' });
  return handleResponse<VideoInterview>(res);
}

export async function endVideoInterview(id: string): Promise<VideoInterview> {
  const res = await fetch(`/api/v2/assessments/video-interviews/${id}/end`, { method: 'PATCH' });
  return handleResponse<VideoInterview>(res);
}

export async function submitVideoInterviewFeedback(id: string, feedback: any): Promise<VideoInterview> {
  const res = await fetch(`/api/v2/assessments/video-interviews/${id}/feedback`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  return handleResponse<VideoInterview>(res);
}

export async function cancelVideoInterview(id: string): Promise<VideoInterview> {
  const res = await fetch(`/api/v2/assessments/video-interviews/${id}/cancel`, { method: 'PATCH' });
  return handleResponse<VideoInterview>(res);
}

// ── Candidate-Facing Public APIs ─────────────────────────────────

export async function fetchCandidateAttempt(token: string): Promise<AssessmentAttempt> {
  const res = await fetch(`/api/v2/assessment-take/${token}`);
  return handleResponse<AssessmentAttempt>(res);
}

export async function startCandidateAttempt(token: string): Promise<AssessmentAttempt> {
  const res = await fetch(`/api/v2/assessment-take/${token}/start`, { method: 'POST' });
  return handleResponse<AssessmentAttempt>(res);
}

export async function submitCandidateQuiz(
  token: string,
  responses: Array<{
    questionId: string;
    selectedOptions?: string[];
    textAnswer?: string;
    timeTakenMs?: number;
  }>
): Promise<{
  attemptId: string;
  score: number;
  totalPoints: number;
  percentage: string;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
}> {
  const res = await fetch(`/api/v2/assessment-take/${token}/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responses }),
  });
  return handleResponse(res);
}

export async function runCandidateCode(
  token: string,
  data: {
    challengeId: string;
    sourceCode: string;
    language: string;
    languageId: number;
  }
): Promise<{
  testCases: Array<{
    testCaseId: string;
    passed: boolean;
    actualOutput: string | null;
    expectedOutput: string;
    time?: number | null;
    memory?: number | null;
    error?: string | null;
    statusDescription: string;
  }>;
  passed: number;
  total: number;
}> {
  const res = await fetch(`/api/v2/assessment-take/${token}/code/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function submitCandidateCode(
  token: string,
  data: {
    challengeId: string;
    sourceCode: string;
    language: string;
    languageId: number;
  }
): Promise<{
  submissionId: string;
  status: CodeSubmissionStatus;
  score: number;
  maxScore: number;
  testCasesPassed: number;
  totalTestCases: number;
  sampleResults: any[];
  hiddenPassed: number;
  hiddenTotal: number;
}> {
  const res = await fetch(`/api/v2/assessment-take/${token}/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function completeCandidateCodeAssessment(token: string): Promise<AssessmentAttempt> {
  const res = await fetch(`/api/v2/assessment-take/${token}/code/complete`, { method: 'POST' });
  return handleResponse<AssessmentAttempt>(res);
}

export async function updateCandidateAntiCheat(
  token: string,
  data: { tabSwitchCount?: number; fullscreenExits?: number }
): Promise<{ id: string; tabSwitchCount: number; fullscreenExits: number }> {
  const res = await fetch(`/api/v2/assessment-take/${token}/anti-cheat`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchCandidateVideoRoom(token: string): Promise<{
  id: string;
  roomName: string;
  scheduledAt: string;
  status: VideoInterviewStatus;
  candidateProfile?: { name: string };
}> {
  const res = await fetch(`/api/v2/assessment-take/video/${token}`);
  return handleResponse(res);
}

