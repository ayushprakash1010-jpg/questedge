"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Pause,
  ArrowRight,
  Sparkles,
  XCircle,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  Plus,
  MoreHorizontal,
  GraduationCap,
  Heart,
  Copy,
  Check,
  Printer,
  Download,
  AlertTriangle,
} from "lucide-react";
import { FeedbackDisplay } from "./feedback-display";
import { FeedbackForm } from "./feedback-form";
import { DecisionModal } from "./decision-modal";
import { useFocusTrap } from "@/hooks/use-focus-trap";

// Candidate detail surface — design-system-v2/ui-kit/04-Candidate-Detail.html.
// Rendered as a wide right-edge drawer (max-w-7xl) so the two-column layout
// from the mockup fits without breaking the kanban-launch flow it slots into.

interface StageHistoryItem {
  id: string;
  stageId: string;
  enteredAt: string;
  exitedAt: string | null;
  outcome: string | null;
  stage: { id: string; name: string; stageType: string };
}

interface ApplicationDetail {
  id: string;
  status: string;
  appliedAt: string;
  stageEnteredAt: string;
  completedAt: string | null;
  rejectionReason: string | null;
  selectionNotes: string | null;
  totalScore: string | null;
  aiSummary: string | null;
  aiMatchScore: string | null;
  aiMatchSummary: string | null;
  coverLetter: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    location?: string | null;
    source: string;
    currentCompany: string | null;
    currentRole: string | null;
    experienceYears: string | null;
    expectedCtc: string | null;
    currentCtc?: string | null;
    noticePeriodDays: number | null;
    notes: string | null;
    education?: string | null;
    resumeUrl?: string | null;
  };
  hiringPlan: { id: string; title: string; department: string; designation: string };
  currentStage: { id: string; name: string; stageType: string } | null;
  stageHistory: StageHistoryItem[];
}

interface StageDef {
  id: string;
  name: string;
  stageOrder: number;
}

const sourceLabel: Record<string, string> = {
  REFERRAL: "Referral",
  JOB_BOARD: "Job Board",
  DIRECT: "Direct",
  AGENCY: "Agency",
  INTERNAL: "Internal",
};

const statusPillClass: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SELECTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
  WITHDRAWN: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusDotClass: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  SELECTED: "bg-indigo-500",
  REJECTED: "bg-red-500",
  ON_HOLD: "bg-amber-500",
  WITHDRAWN: "bg-slate-400",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatINR(value: string | null | undefined): string | null {
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
  return `₹${num.toLocaleString("en-IN")}`;
}

function formatRelativeDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface InterviewQuestion {
  id?: number | string;
  category: string;
  question: string;
  rationale: string;
  idealAnswerRubric: string;
  redFlags: string;
}

interface InterviewQuestionsData {
  source: string;
  candidateName: string;
  roleTitle: string;
  stageName: string;
  questions: InterviewQuestion[];
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printCandidateScorecard(app: ApplicationDetail) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const overall = app.totalScore
    ? Math.round(Number(app.totalScore))
    : app.aiMatchScore
      ? Math.round(Number(app.aiMatchScore))
      : null;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Candidate Scorecard - ${escapeHtml(app.candidate.name)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 20px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .logo span { color: #06b6d4; }
    .doc-meta { text-align: right; font-size: 11px; color: #64748b; }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .cand-name { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
    .cand-sub { font-size: 13px; color: #475569; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      background: #e0e7ff;
      color: #3730a3;
    }
    .score-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .score-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      background: #fff;
    }
    .card h4 {
      margin: 0 0 10px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .field-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; font-size: 12px; }
    .field-label { color: #64748b; }
    .field-val { font-weight: 600; color: #1e293b; }
    .timeline { margin-top: 10px; }
    .timeline-item { padding: 6px 0; border-left: 2px solid #cbd5e1; padding-left: 14px; position: relative; }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -5px;
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4f46e5;
    }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Quest<span>Edge</span></div>
    <div class="doc-meta">
      <div>CONFIDENTIAL EVALUATION SCORECARD</div>
      <div>Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
    </div>
  </div>

  <div class="title-row">
    <div>
      <h1 class="cand-name">${escapeHtml(app.candidate.name)}</h1>
      <div class="cand-sub">${escapeHtml(app.hiringPlan.designation)} · ${escapeHtml(app.hiringPlan.department)}</div>
      <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
        ${escapeHtml(app.candidate.email)} ${app.candidate.phone ? `· ${escapeHtml(app.candidate.phone)}` : ""} ${app.candidate.location ? `· ${escapeHtml(app.candidate.location)}` : ""}
      </div>
    </div>
    <div class="badge">${escapeHtml(app.status)}</div>
  </div>

  <div class="score-banner">
    <div class="score-circle">${overall ?? "—"}</div>
    <div>
      <div style="font-weight: 700; font-size: 14px; color: #1e293b;">
        ${overall !== null ? (overall >= 80 ? "Strong Candidate Fit" : overall >= 60 ? "Qualified Candidate Fit" : "Candidate Evaluation in Progress") : "Score Calculation Pending"}
      </div>
      <div style="font-size: 12px; color: #475569; margin-top: 3px;">
        ${escapeHtml(app.aiMatchSummary || app.aiSummary || "Candidate background evaluated against specific role requirements and skills.")}
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Candidate Background</h4>
      <div class="field-row"><span class="field-label">Current Role</span><span class="field-val">${escapeHtml(app.candidate.currentRole || "—")}</span></div>
      <div class="field-row"><span class="field-label">Current Company</span><span class="field-val">${escapeHtml(app.candidate.currentCompany || "—")}</span></div>
      <div class="field-row"><span class="field-label">Experience</span><span class="field-val">${app.candidate.experienceYears ? `${app.candidate.experienceYears} Years` : "—"}</span></div>
      <div class="field-row"><span class="field-label">Notice Period</span><span class="field-val">${app.candidate.noticePeriodDays ? `${app.candidate.noticePeriodDays} Days` : "—"}</span></div>
      <div class="field-row"><span class="field-label">Expected CTC</span><span class="field-val">${formatINR(app.candidate.expectedCtc) || "—"}</span></div>
    </div>

    <div class="card">
      <h4>Hiring Mandate Details</h4>
      <div class="field-row"><span class="field-label">Mandate Title</span><span class="field-val">${escapeHtml(app.hiringPlan.title)}</span></div>
      <div class="field-row"><span class="field-label">Department</span><span class="field-val">${escapeHtml(app.hiringPlan.department)}</span></div>
      <div class="field-row"><span class="field-label">Current Stage</span><span class="field-val">${escapeHtml(app.currentStage?.name || "Active Pipeline")}</span></div>
      <div class="field-row"><span class="field-label">Candidate Source</span><span class="field-val">${escapeHtml(app.candidate.source)}</span></div>
      <div class="field-row"><span class="field-label">Applied Date</span><span class="field-val">${new Date(app.appliedAt).toLocaleDateString()}</span></div>
    </div>
  </div>

  ${app.stageHistory && app.stageHistory.length > 0 ? `
  <div class="card" style="margin-bottom: 18px;">
    <h4>Interview Progression History</h4>
    <div class="timeline">
      ${app.stageHistory.map(h => `
        <div class="timeline-item">
          <div style="font-weight: 600; color: #1e293b;">${escapeHtml(h.stage.name)} ${h.outcome ? `— <span style="color:#4f46e5;">${escapeHtml(h.outcome)}</span>` : ""}</div>
          <div style="font-size: 11px; color: #64748b;">
            Entered: ${new Date(h.enteredAt).toLocaleDateString()} ${h.exitedAt ? `· Completed: ${new Date(h.exitedAt).toLocaleDateString()}` : "· Active / In Progress"}
          </div>
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  ${app.candidate.notes ? `
  <div class="card">
    <h4>Internal Evaluation Notes</h4>
    <p style="margin: 0; font-size: 12px; color: #334155; white-space: pre-wrap;">${escapeHtml(app.candidate.notes)}</p>
  </div>
  ` : ""}

  <div class="footer">
    QuestEdge Enterprise Talent Platform · Client-Ready Assessment Scorecard
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

export function CandidateSheet({
  applicationId,
  planId,
  onClose,
  onUpdated,
}: {
  applicationId: string;
  planId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);
  const [stages, setStages] = useState<StageDef[]>([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const drawerRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [questionsData, setQuestionsData] = useState<InterviewQuestionsData | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState<number | string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-questions`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setQuestionsData(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingQuestions(false);
    }
  }, [applicationId]);

  const copyQuestionText = (text: string, id: number | string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionId(id);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  const copyAllQuestions = () => {
    if (!questionsData) return;
    const formatted = questionsData.questions
      .map(
        (q, idx) =>
          `Q${idx + 1} [${q.category}]:\n${q.question}\n\nRationale: ${q.rationale}\nIdeal Rubric: ${q.idealAnswerRubric}\nRed Flags: ${q.redFlags}`
      )
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      if (res.ok) setApp(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/stages`);
      if (res.ok) {
        const data = await res.json();
        setStages(
          Array.isArray(data)
            ? data.map((s: { id: string; name: string; stageOrder: number }) => ({
                id: s.id,
                name: s.name,
                stageOrder: s.stageOrder,
              }))
            : []
        );
      }
    } catch {
      // ignore
    }
  }, [planId]);

  useEffect(() => {
    fetchDetail();
    fetchStages();
  }, [fetchDetail, fetchStages]);

  const currentOrder = useMemo(() => {
    if (!app?.currentStage) return undefined;
    return stages.find((s) => s.id === app.currentStage!.id)?.stageOrder;
  }, [app, stages]);

  const nextStage = useMemo(() => {
    if (currentOrder === undefined) return null;
    return stages.find((s) => s.stageOrder === currentOrder + 1) ?? null;
  }, [currentOrder, stages]);

  const handleMoveToNext = async () => {
    if (!nextStage) return;
    setActing(true);
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStageId: nextStage.id }),
      });
      fetchDetail();
      onUpdated();
    } catch {
      // ignore
    } finally {
      setActing(false);
    }
  };

  const handleStatus = async (status: string, reason?: string) => {
    setActing(true);
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      setShowRejectDialog(false);
      fetchDetail();
      onUpdated();
    } catch {
      // ignore
    } finally {
      setActing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteDraft.trim() || !app) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/candidates/${app.candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteDraft }),
      });
      if (res.ok) {
        setNoteDraft("");
        fetchDetail();
      }
    } catch {
      // ignore
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={app ? `Candidate evaluation: ${app.candidate.name}` : "Candidate evaluation drawer"}
        tabIndex={-1}
        className="flex h-full w-full max-w-7xl flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl outline-none"
      >
        {loading || !app ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
              <nav className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Hiring Plans</span>
                <span className="text-slate-300">/</span>
                <span>{app.hiringPlan.title}</span>
                <span className="text-slate-300">/</span>
                <span>Pipeline</span>
                <span className="text-slate-300">/</span>
                <span className="font-medium text-slate-700">
                  {app.candidate.name}
                </span>
              </nav>
              <button
                onClick={onClose}
                aria-label="Close candidate evaluation drawer"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Main content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <HeroCard
                  app={app}
                  onMoveToNext={handleMoveToNext}
                  onPutOnHold={() => handleStatus("ON_HOLD")}
                  onReject={() => setShowRejectDialog(true)}
                  onMakeDecision={() => setShowDecisionModal(true)}
                  onOpenAiQuestions={() => setActiveTab("ai-questions")}
                  onExportScorecard={() => printCandidateScorecard(app)}
                  hasNextStage={!!nextStage}
                  acting={acting}
                />

                {/* Reject inline dialog */}
                {showRejectDialog && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-900">
                      Reject Candidate
                    </p>
                    <Textarea
                      className="mt-2"
                      placeholder="Reason for rejection (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatus("REJECTED", rejectReason)}
                        disabled={acting}
                      >
                        Confirm Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRejectDialog(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="ai-questions" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      AI Questions
                      {questionsData && (
                        <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
                          {questionsData.questions.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="feedback">Feedback &amp; Score</TabsTrigger>
                    {app.currentStage && app.status === "ACTIVE" && (
                      <TabsTrigger value="give-feedback">Give Feedback</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* Profile + Scorecard side-by-side on lg */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <ProfileCard app={app} />
                      <ScorecardCard
                        app={app}
                        onExport={() => printCandidateScorecard(app)}
                      />
                    </div>

                    {/* Interview History Timeline */}
                    <InterviewHistoryCard app={app} />

                    {/* Cover Letter */}
                    {app.coverLetter && (
                      <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Cover Letter
                        </h3>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                          {app.coverLetter}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="ai-questions">
                    <AiQuestionsTab
                      app={app}
                      questionsData={questionsData}
                      loading={loadingQuestions}
                      onGenerate={fetchQuestions}
                      onCopyQuestion={copyQuestionText}
                      copiedQuestionId={copiedQuestionId}
                      onCopyAll={copyAllQuestions}
                      copiedAll={copiedAll}
                    />
                  </TabsContent>

                  <TabsContent value="feedback">
                    <FeedbackDisplay
                      applicationId={app.id}
                      aiSummary={app.aiSummary}
                      totalScore={app.totalScore}
                    />
                  </TabsContent>

                  {app.currentStage && app.status === "ACTIVE" && (
                    <TabsContent value="give-feedback">
                      <FeedbackForm
                        applicationId={app.id}
                        stageId={app.currentStage.id}
                        stageName={app.currentStage.name}
                        candidateName={app.candidate.name}
                        roleName={app.hiringPlan.designation}
                        skills={[]}
                        onSubmitted={() => {
                          fetchDetail();
                        }}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>

              {/* Right rail */}
              <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white lg:block">
                <PipelineStageList
                  stages={stages}
                  history={app.stageHistory}
                  currentStageId={app.currentStage?.id ?? null}
                />
                <DocumentsSection app={app} />
                <NotesSection
                  candidateNotes={app.candidate.notes}
                  noteDraft={noteDraft}
                  onChangeDraft={setNoteDraft}
                  onSave={handleSaveNote}
                  saving={savingNote}
                />
              </aside>
            </div>
          </>
        )}
      </div>

      {showDecisionModal && app && (
        <DecisionModal
          applicationId={app.id}
          candidateName={app.candidate.name}
          roleName={app.hiringPlan.designation}
          onDecisionMade={() => {
            fetchDetail();
            onUpdated();
          }}
          onClose={() => setShowDecisionModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hero card
// ─────────────────────────────────────────────────────────────────────────

function HeroCard({
  app,
  onMoveToNext,
  onPutOnHold,
  onReject,
  onMakeDecision,
  onOpenAiQuestions,
  onExportScorecard,
  hasNextStage,
  acting,
}: {
  app: ApplicationDetail;
  onMoveToNext: () => void;
  onPutOnHold: () => void;
  onReject: () => void;
  onMakeDecision: () => void;
  onOpenAiQuestions: () => void;
  onExportScorecard: () => void;
  hasNextStage: boolean;
  acting: boolean;
}) {
  const isActive = app.status === "ACTIVE";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      {/* Banner with subtle dot pattern */}
      <div className="relative h-20 bg-gradient-to-br from-indigo-50 to-cyan-50">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #4f46e5 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative px-6 pb-5">
        {/* Avatar overlap + status pills */}
        <div className="flex items-end justify-between">
          <div className="relative -mt-8 inline-block">
            <Avatar
              size="xl"
              className="h-16 w-16 border-[3px] border-white text-xl font-bold shadow-md"
            >
              <AvatarFallback>{getInitials(app.candidate.name)}</AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                statusPillClass[app.status] ??
                  "bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  statusDotClass[app.status] ?? "bg-slate-400"
                )}
              />
              {app.status.replace("_", " ")}
            </span>
            {app.currentStage && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                {app.currentStage.name}
              </span>
            )}
            <button
              aria-label="More"
              className="rounded-md border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Name + role */}
        <div className="mt-2.5">
          <h2 className="text-xl font-bold text-slate-900">
            {app.candidate.name}
          </h2>
          {(app.candidate.currentRole || app.candidate.currentCompany) && (
            <p className="mt-0.5 text-sm text-slate-500">
              {[app.candidate.currentRole, app.candidate.currentCompany]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <MetaItem icon={Mail}>{app.candidate.email}</MetaItem>
          {app.candidate.phone && (
            <MetaItem icon={Phone}>{app.candidate.phone}</MetaItem>
          )}
          {app.candidate.location && (
            <MetaItem icon={MapPin}>{app.candidate.location}</MetaItem>
          )}
          {app.candidate.experienceYears && (
            <MetaItem icon={Briefcase}>
              {app.candidate.experienceYears} yrs experience
            </MetaItem>
          )}
          <MetaItem icon={Heart}>
            Source: {sourceLabel[app.candidate.source] ?? app.candidate.source}
          </MetaItem>
        </div>

        {/* Action row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {isActive && hasNextStage && (
            <Button size="sm" onClick={onMoveToNext} disabled={acting}>
              <ArrowRight className="h-3.5 w-3.5" />
              Move to Next
            </Button>
          )}
          {isActive && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onMakeDecision}
                disabled={acting}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Make Decision
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onPutOnHold}
                disabled={acting}
              >
                <Pause className="h-3.5 w-3.5" />
                Hold
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAiQuestions}
            className="ml-auto gap-1.5 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            AI Questions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportScorecard}
            className="gap-1.5 text-slate-700 hover:bg-slate-50"
            title="Download client-ready scorecard PDF"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export Scorecard
          </Button>
          {isActive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onReject}
              disabled={acting}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Profile + Scorecard
// ─────────────────────────────────────────────────────────────────────────

function ProfileCard({ app }: { app: ApplicationDetail }) {
  const c = app.candidate;
  const expectedCtc = formatINR(c.expectedCtc);
  const currentCtc = formatINR(c.currentCtc);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
        <span className="text-sm font-semibold text-slate-900">Profile</span>
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Background
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Current Role" value={c.currentRole} />
          <Field label="Company" value={c.currentCompany} />
          <Field
            label="Experience"
            value={c.experienceYears ? `${c.experienceYears} years` : null}
          />
          <Field label="Education" value={c.education} icon={GraduationCap} />
          <Field
            label="Notice Period"
            value={c.noticePeriodDays ? `${c.noticePeriodDays} days` : null}
          />
          <Field label="Expected CTC" value={expectedCtc} />
          {currentCtc && <Field label="Current CTC" value={currentCtc} />}
          <Field label="Applied On" value={formatRelativeDate(app.appliedAt)} />
        </div>
      </div>
    </div>
  );
}

function ScorecardCard({
  app,
  onExport,
}: {
  app: ApplicationDetail;
  onExport?: () => void;
}) {
  const overall = app.totalScore
    ? Math.round(Number(app.totalScore))
    : app.aiMatchScore
      ? Math.round(Number(app.aiMatchScore))
      : null;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
        <span className="text-sm font-semibold text-slate-900">Scorecard</span>
        <div className="flex items-center gap-2">
          {overall !== null && (
            <span className="text-[11px] text-slate-400">
              {app.totalScore ? "From feedback" : "AI match estimate"}
            </span>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-7 gap-1 px-2 text-[11px] text-slate-600 hover:text-slate-900"
              title="Download client-ready scorecard PDF"
            >
              <Download className="h-3 w-3" />
              PDF
            </Button>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        {overall === null ? (
          <p className="text-sm text-slate-400">
            No score yet. Submit interview feedback to compute scores.
          </p>
        ) : (
          <div className="flex items-center gap-5">
            <ScoreRing value={overall} />
            <div className="flex-1">
              <p className="text-[11px] text-slate-400">Overall</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                {overall >= 80
                  ? "Strong candidate"
                  : overall >= 60
                    ? "Good fit"
                    : "Needs more signal"}
              </p>
              {app.aiMatchSummary && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                  {app.aiMatchSummary}
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI assessment card */}
        {app.aiMatchSummary && overall !== null && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-purple-50 to-cyan-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </span>
              <span className="text-xs font-bold text-slate-800">
                AI Assessment
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {app.aiMatchSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="7"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="url(#scoreRingGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreRingGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Interview History
// ─────────────────────────────────────────────────────────────────────────

function InterviewHistoryCard({ app }: { app: ApplicationDetail }) {
  if (!app.stageHistory || app.stageHistory.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
        <span className="text-sm font-semibold text-slate-900">
          Interview History
        </span>
      </div>
      <div className="px-5 py-4">
        <ol className="space-y-4">
          {app.stageHistory.map((h, idx) => {
            const exited = h.exitedAt
              ? new Date(h.exitedAt).getTime()
              : Date.now();
            const days = Math.max(
              1,
              Math.round(
                (exited - new Date(h.enteredAt).getTime()) / (1000 * 60 * 60 * 24)
              )
            );

            const isOpen = !h.exitedAt;
            const verdict = h.outcome;

            return (
              <li key={h.id} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      isOpen
                        ? "bg-indigo-50"
                        : verdict === "PASSED"
                          ? "bg-emerald-50"
                          : verdict === "REJECTED"
                            ? "bg-red-50"
                            : "bg-slate-100"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        isOpen
                          ? "bg-indigo-500"
                          : verdict === "PASSED"
                            ? "bg-emerald-500"
                            : verdict === "REJECTED"
                              ? "bg-red-500"
                              : "bg-slate-400"
                      )}
                    />
                  </div>
                  {idx < app.stageHistory.length - 1 && (
                    <span className="my-1 w-px flex-1 bg-slate-200" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {h.stage.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatRelativeDate(h.enteredAt)}
                    {h.exitedAt && ` → ${formatRelativeDate(h.exitedAt)}`}
                    {!h.exitedAt && " · current"}
                    {" · "}
                    {days}d
                  </p>
                  {verdict && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-2 text-[10px]",
                        verdict === "PASSED" &&
                          "border-emerald-200 bg-emerald-50 text-emerald-700",
                        verdict === "REJECTED" &&
                          "border-red-200 bg-red-50 text-red-700",
                        verdict !== "PASSED" &&
                          verdict !== "REJECTED" &&
                          "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {verdict === "PASSED"
                        ? "✓ Cleared"
                        : verdict === "REJECTED"
                          ? "✗ Rejected"
                          : verdict}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Right rail sections
// ─────────────────────────────────────────────────────────────────────────

function PipelineStageList({
  stages,
  history,
  currentStageId,
}: {
  stages: StageDef[];
  history: StageHistoryItem[];
  currentStageId: string | null;
}) {
  if (stages.length === 0) return null;

  const completedIds = new Set(
    history.filter((h) => h.exitedAt).map((h) => h.stageId)
  );
  const ordered = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  const currentEntry = currentStageId
    ? history.find((h) => !h.exitedAt && h.stageId === currentStageId)
    : null;
  const dayInPipeline = currentEntry
    ? Math.max(
        1,
        Math.round(
          (Date.now() - new Date(history[0]?.enteredAt ?? Date.now()).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Pipeline Stage
      </p>
      <ul className="space-y-2">
        {ordered.map((s) => {
          const isCurrent = s.id === currentStageId;
          const isDone = completedIds.has(s.id);
          return (
            <li key={s.id} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  isCurrent
                    ? "bg-indigo-600 ring-[3px] ring-indigo-100"
                    : isDone
                      ? "bg-emerald-500"
                      : "bg-slate-200"
                )}
              />
              <span
                className={cn(
                  "flex-1 text-xs font-medium",
                  isCurrent
                    ? "text-indigo-700"
                    : isDone
                      ? "text-slate-700"
                      : "text-slate-400"
                )}
              >
                {s.name}
              </span>
              {isDone ? (
                <span className="text-[11px] font-semibold text-emerald-600">
                  ✓
                </span>
              ) : isCurrent ? (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                  Active
                </span>
              ) : (
                <span className="text-[10px] text-slate-300">Upcoming</span>
              )}
            </li>
          );
        })}
      </ul>
      {dayInPipeline !== null && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            Day {dayInPipeline}
          </span>{" "}
          in pipeline
        </div>
      )}
    </div>
  );
}

function DocumentsSection({ app }: { app: ApplicationDetail }) {
  const resumeUrl = app.candidate.resumeUrl ?? null;
  const [opening, setOpening] = useState(false);

  const handleOpenResume = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!resumeUrl) return;
    if (resumeUrl.startsWith("http://") || resumeUrl.startsWith("https://")) {
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setOpening(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(
        `${API_URL}/api/v1/candidate/profile/${app.candidate.id}/resume`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      console.error("Failed to get presigned resume URL:", err);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Documents
      </p>
      <div className="space-y-1.5">
        {resumeUrl ? (
          <button
            type="button"
            onClick={handleOpenResume}
            disabled={opening}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-indigo-200 hover:bg-white disabled:opacity-60 transition-colors"
          >
            <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="flex-1 truncate text-xs font-medium text-slate-700">
              {app.candidate.name.replace(/\s+/g, "_")}_CV
            </span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </button>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
            No documents uploaded
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" className="mt-2 w-full" disabled>
        <Plus className="h-3 w-3" />
        Upload Document
      </Button>
    </div>
  );
}

function NotesSection({
  candidateNotes,
  noteDraft,
  onChangeDraft,
  onSave,
  saving,
}: {
  candidateNotes: string | null;
  noteDraft: string;
  onChangeDraft: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Internal Notes
      </p>
      {candidateNotes && (
        <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <Clock className="h-2.5 w-2.5" />
            Saved note
          </p>
          {candidateNotes}
        </div>
      )}
      <Textarea
        rows={3}
        placeholder="Add a note…"
        value={noteDraft}
        onChange={(e) => onChangeDraft(e.target.value)}
        className="text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={onSave}
        disabled={saving || !noteDraft.trim()}
      >
        {saving ? "Saving…" : "Save Note"}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {value || "—"}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AI Interview Questions Generator Component
// ─────────────────────────────────────────────────────────────────────────

function AiQuestionsTab({
  app,
  questionsData,
  loading,
  onGenerate,
  onCopyQuestion,
  copiedQuestionId,
  onCopyAll,
  copiedAll,
}: {
  app: ApplicationDetail;
  questionsData: InterviewQuestionsData | null;
  loading: boolean;
  onGenerate: () => void;
  onCopyQuestion: (text: string, id: number | string) => void;
  copiedQuestionId: number | string | null;
  onCopyAll: () => void;
  copiedAll: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-cyan-50/60 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                AI Interview Question Generator
              </h3>
              {questionsData && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold",
                    questionsData.source === "gemini-ai"
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-indigo-300 bg-indigo-50 text-indigo-700"
                  )}
                >
                  {questionsData.source === "gemini-ai"
                    ? "✨ Powered by Gemini AI"
                    : "🎯 Curated Role Evaluator"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Generates 5 tailored technical &amp; behavioral interview questions with answer rubrics comparing {app.candidate.name}’s specific skills against the {app.hiringPlan.designation} requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {questionsData && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopyAll}
                  className="gap-1.5 text-xs bg-white"
                >
                  {copiedAll ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  {copiedAll ? "Copied All!" : "Copy All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printCandidateScorecard(app)}
                  className="gap-1.5 text-xs bg-white"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  Print / PDF
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm"
            >
              <Sparkles className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {loading
                ? "Generating Questions…"
                : questionsData
                ? "Regenerate Questions"
                : "Generate Questions"}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-14 shadow-sm">
          <div className="relative mb-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <Sparkles className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Analyzing candidate resume &amp; job mandate…
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Synthesizing background, years of experience, and role competency rubrics.
          </p>
        </div>
      )}

      {/* Empty state when not loaded */}
      {!loading && !questionsData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center shadow-xs">
          <div className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">
            Ready to generate interview questions
          </h4>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Click &ldquo;Generate Questions&rdquo; to analyze {app.candidate.name}’s profile against the {app.hiringPlan.designation} role requirements and produce 5 targeted questions with answer rubrics and red flags.
          </p>
          <Button
            size="sm"
            onClick={onGenerate}
            className="mt-4 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate 5 Tailored Questions
          </Button>
        </div>
      )}

      {/* Questions list */}
      {!loading && questionsData && questionsData.questions && (
        <div className="space-y-4">
          {questionsData.questions.map((item, idx) => {
            const qId = item.id ?? idx + 1;
            const isCopied = copiedQuestionId === qId;

            return (
              <div
                key={qId}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs transition hover:border-slate-300"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                      {item.category}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopyQuestion(item.question, qId)}
                    className="h-7 gap-1 px-2 text-xs text-slate-600 hover:text-slate-900"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Interview Question
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                      &ldquo;{item.question}&rdquo;
                    </p>
                  </div>

                  {item.rationale && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Interviewer Rationale: </span>
                      {item.rationale}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {item.idealAnswerRubric && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          Ideal Answer Indicators
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                          {item.idealAnswerRubric}
                        </p>
                      </div>
                    )}

                    {item.redFlags && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          Red Flags to Watch For
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-amber-900">
                          {item.redFlags}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
