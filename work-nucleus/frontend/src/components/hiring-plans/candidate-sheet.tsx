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
} from "lucide-react";
import { FeedbackDisplay } from "./feedback-display";
import { FeedbackForm } from "./feedback-form";
import { DecisionModal } from "./decision-modal";

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
  const [savingNote, setSavingNote] = useState(false);

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
      />

      {/* Sheet */}
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl">
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
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
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

                <Tabs defaultValue="overview" className="mt-6">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback &amp; Score</TabsTrigger>
                    {app.currentStage && app.status === "ACTIVE" && (
                      <TabsTrigger value="give-feedback">Give Feedback</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* Profile + Scorecard side-by-side on lg */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <ProfileCard app={app} />
                      <ScorecardCard app={app} />
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
  hasNextStage,
  acting,
}: {
  app: ApplicationDetail;
  onMoveToNext: () => void;
  onPutOnHold: () => void;
  onReject: () => void;
  onMakeDecision: () => void;
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
            variant="ai"
            size="sm"
            className="ml-auto"
            disabled={!app.aiMatchSummary}
            title={app.aiMatchSummary ?? "AI summary not available"}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Summary
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

function ScorecardCard({ app }: { app: ApplicationDetail }) {
  const overall = app.totalScore
    ? Math.round(Number(app.totalScore))
    : app.aiMatchScore
      ? Math.round(Number(app.aiMatchScore))
      : null;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
        <span className="text-sm font-semibold text-slate-900">Scorecard</span>
        {overall !== null && (
          <span className="text-[11px] text-slate-400">
            {app.totalScore ? "From feedback" : "AI match estimate"}
          </span>
        )}
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

  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Documents
      </p>
      <div className="space-y-1.5">
        {resumeUrl ? (
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-indigo-200 hover:bg-white"
          >
            <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="flex-1 truncate text-xs font-medium text-slate-700">
              {app.candidate.name.replace(/\s+/g, "_")}_CV
            </span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>
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
