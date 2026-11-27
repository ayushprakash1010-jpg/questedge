"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Award,
  MoreVertical,
  FileText,
  ArrowRight,
  Sparkles,
  Video,
  ClipboardCheck,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Pause,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, readResponseError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { CandidateSheet } from "@/components/hiring-plans/candidate-sheet";
import { InviteModal } from "@/components/assessments/invite-modal";
import { ScheduleVideoModal } from "@/components/assessments/schedule-video-modal";
import { fetchAssessments, type HiringAssessment } from "@/lib/assessment-api";

interface StageDef {
  id: string;
  name: string;
  stageType?: string;
  stageOrder: number;
}

interface CandidateApplication {
  id: string;
  candidateId?: string;
  hiringPlanId: string;
  mandateId?: string;
  isReferral?: boolean;
  referralId?: string;
  status?: string;
  resumeUrl?: string;
  aiMatchScore?: number;
  offer?: { id: string; status: string } | null;
  decision?: { id: string; decision: string } | null;
  _count?: { feedbacks?: number };
  candidateProfile: {
    id?: string;
    name: string;
    email: string;
    headline: string;
    experienceYears: string | number;
    resumeUrl?: string;
  };
  referral?: { id?: string; recruiter: { name: string }; status?: string } | null;
  currentStage: StageDef | null;
}

interface PipelineKanbanProps {
  mandateId: string;
  mandateTitle?: string;
  onUpdated?: () => void;
}

const FALLBACK_STAGES: StageDef[] = [
  { id: "sourced", name: "Sourced", stageOrder: 1 },
  { id: "screening", name: "Screening", stageOrder: 2 },
  { id: "shortlisted", name: "Shortlisted", stageOrder: 3 },
  { id: "interview", name: "Interview", stageOrder: 4 },
  { id: "offer", name: "Offer / Hired", stageOrder: 5 },
];

export function PipelineKanban({
  mandateId,
  mandateTitle,
  onUpdated,
}: PipelineKanbanProps) {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [stages, setStages] = useState<StageDef[]>(FALLBACK_STAGES);
  const [loading, setLoading] = useState(true);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Selected candidate drawer (CandidateSheet)
  const [selectedApp, setSelectedApp] = useState<{
    id: string;
    hiringPlanId: string;
  } | null>(null);

  // Per-card quick menu & modal state
  const [openMenuAppId, setOpenMenuAppId] = useState<string | null>(null);
  const [videoTarget, setVideoTarget] = useState<CandidateApplication | null>(null);
  const [assessmentTarget, setAssessmentTarget] = useState<CandidateApplication | null>(null);
  const [assessments, setAssessments] = useState<HiringAssessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<HiringAssessment | null>(null);
  const [inviteCandidate, setInviteCandidate] = useState<CandidateApplication | null>(null);

  const handleViewResume = (candidateId: string, candidateName?: string) => {
    const nameParam = encodeURIComponent(candidateName || "Candidate");
    window.open(`/resume-viewer?candidateId=${candidateId}&name=${nameParam}`, "_blank");
  };

  const fetchPipeline = useCallback(async () => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const [stageRes, pipelineData] = await Promise.all([
        apiClient<StageDef[]>(`/api/v1/mandates/${mandateId}/stages`, {
          token: accessToken,
        }).catch(() => []),
        apiClient<CandidateApplication[]>(
          `/api/v1/mandates/${mandateId}/pipeline`,
          { token: accessToken },
        ),
      ]);

      const apps = Array.isArray(pipelineData) ? pipelineData : [];
      setApplications(apps);

      const stageMap = new Map<string, StageDef>();
      if (Array.isArray(stageRes) && stageRes.length > 0) {
        stageRes.forEach((s) => stageMap.set(s.id, s));
      } else {
        FALLBACK_STAGES.forEach((s) => stageMap.set(s.id, s));
      }

      apps.forEach((app) => {
        if (app.currentStage?.id && !stageMap.has(app.currentStage.id)) {
          stageMap.set(app.currentStage.id, app.currentStage);
        }
      });

      const sortedStages = Array.from(stageMap.values()).sort(
        (a, b) => a.stageOrder - b.stageOrder,
      );
      setStages(sortedStages);
    } catch (err) {
      console.error("Failed to fetch pipeline", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load mandate pipeline",
      );
      setStages(FALLBACK_STAGES);
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  useEffect(() => {
    const closeMenu = () => setOpenMenuAppId(null);
    if (openMenuAppId) {
      window.addEventListener("click", closeMenu);
      return () => window.removeEventListener("click", closeMenu);
    }
  }, [openMenuAppId]);

  const moveCandidateToStage = async (
    item: CandidateApplication,
    targetStageId: string,
  ) => {
    if (!item || item.currentStage?.id === targetStageId) return;

    if (item.status && item.status !== "ACTIVE") {
      toast.info(
        `Candidate is currently ${item.status.replace("_", " ")}. Open their profile to manage decisions or resume active status.`,
      );
      return;
    }

    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    // Optimistic update
    setApplications((prev) =>
      prev.map((app) =>
        app.id === item.id ? { ...app, currentStage: targetStage } : app,
      ),
    );

    try {
      const res = await fetch(`/api/applications/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStageId }),
      });

      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to move candidate stage"));
      }

      toast.success(`Moved ${item.candidateProfile.name} to ${targetStage.name}`);
      await fetchPipeline();
      onUpdated?.();
    } catch (err) {
      console.error("Failed to move candidate", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to move candidate stage",
      );
      fetchPipeline();
    }
  };

  const handleOpenAssessmentModal = async (app: CandidateApplication) => {
    setAssessmentTarget(app);
    setLoadingAssessments(true);
    try {
      const list = await fetchAssessments();
      setAssessments(Array.isArray(list) ? list : []);
    } catch {
      setAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    setDraggedAppId(appId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    if (!draggedAppId) return;
    const draggedItem = applications.find((a) => a.id === draggedAppId);
    setDraggedAppId(null);
    if (!draggedItem) return;
    await moveCandidateToStage(draggedItem, targetStageId);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3.5 py-2 text-xs text-indigo-900">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          Click any candidate card to open full evaluation: <strong>AI Interview Questions, Feedback, Assessments, Video Rooms, Decision &amp; Offers</strong> — or drag cards between stages.
        </span>
      </div>

      {applications.length === 0 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
          <span>
            No candidates in the pipeline yet. Direct applications and accepted referrals will appear here automatically.
          </span>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {stages.map((stage) => {
          const stageApps = applications.filter((a) => {
            if (a.currentStage?.id === stage.id) return true;
            if (stage.stageOrder === 1 && (!a.currentStage || !a.currentStage.id)) {
              return true;
            }
            return false;
          });
          const isDropTarget = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-72 bg-slate-50 rounded-xl border border-slate-200 flex flex-col transition-all",
                isDropTarget && "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/40",
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={() => setDragOverStageId(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100/60 rounded-t-xl">
                <h3 className="font-semibold text-slate-800 text-sm">{stage.name}</h3>
                <span className="bg-white text-slate-600 font-semibold text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                  {stageApps.length}
                </span>
              </div>

              <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                {stageApps.length === 0 ? (
                  <div className="h-28 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-center p-3">
                    <p className="text-xs text-slate-400">Drag candidates here</p>
                  </div>
                ) : (
                  stageApps.map((app) => {
                    const feedbackCount = app._count?.feedbacks ?? 0;
                    const isMenuOpen = openMenuAppId === app.id;

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() =>
                          setSelectedApp({
                            id: app.id,
                            hiringPlanId: app.hiringPlanId,
                          })
                        }
                        className="group relative bg-white rounded-lg p-3.5 shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
                            {app.candidateProfile.name}
                          </h4>
                          <div
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label={`Actions for ${app.candidateProfile.name}`}
                              onClick={() =>
                                setOpenMenuAppId(isMenuOpen ? null : app.id)
                              }
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-30">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuAppId(null);
                                    setSelectedApp({
                                      id: app.id,
                                      hiringPlanId: app.hiringPlanId,
                                    });
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Open Evaluation &amp; Decision
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuAppId(null);
                                    handleOpenAssessmentModal(app);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <ClipboardCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  Send Assessment Invite
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuAppId(null);
                                    setVideoTarget(app);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <Video className="h-3.5 w-3.5 text-sky-500" />
                                  Schedule Video Interview
                                </button>

                                {(app.resumeUrl || app.candidateProfile?.resumeUrl) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuAppId(null);
                                      handleViewResume(
                                        app.candidateId ||
                                          app.candidateProfile?.id ||
                                          app.id,
                                        app.candidateProfile?.name,
                                      );
                                    }}
                                    className="w-full flex items-center gap-2 px-3.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                                    View Resume
                                  </button>
                                )}

                                {(!app.status || app.status === "ACTIVE") && (
                                  <>
                                    <div className="my-1 border-t border-slate-100" />
                                    <p className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Move Stage
                                    </p>
                                    {stages.map((target) => (
                                      <button
                                        key={target.id}
                                        type="button"
                                        disabled={target.id === app.currentStage?.id}
                                        onClick={() => {
                                          setOpenMenuAppId(null);
                                          moveCandidateToStage(app, target.id);
                                        }}
                                        className="w-full flex items-center justify-between px-3.5 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
                                      >
                                        <span>{target.name}</span>
                                        <ArrowRight className="h-3 w-3 opacity-60" />
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 mb-2.5 line-clamp-2">
                          {app.candidateProfile.headline || "No headline provided"}
                        </p>

                        {/* Metadata & workflow tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            <Award className="h-3 w-3" />{" "}
                            {app.candidateProfile.experienceYears || 0} yrs exp
                          </span>
                          {app.aiMatchScore != null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              ★ {app.aiMatchScore}% match
                            </span>
                          )}
                          {app.status === "SELECTED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Selected
                            </span>
                          )}
                          {app.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="h-3 w-3" /> Rejected
                            </span>
                          )}
                          {app.status === "ON_HOLD" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              <Pause className="h-3 w-3" /> On Hold
                            </span>
                          )}
                          {app.offer && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                              Offer: {app.offer.status}
                            </span>
                          )}
                          {feedbackCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              <MessageSquare className="h-3 w-3" /> {feedbackCount} feedback
                            </span>
                          )}
                          {app.referral?.status && (
                            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {app.referral.status.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        {/* Source badge & quick actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          {app.referral ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md truncate border border-emerald-100 flex-1">
                              ✨ {app.referral.recruiter.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md truncate border border-slate-100 flex-1">
                              Direct App
                            </span>
                          )}
                          {(app.resumeUrl || app.candidateProfile?.resumeUrl) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewResume(
                                  app.candidateId ||
                                    app.candidateProfile?.id ||
                                    app.id,
                                  app.candidateProfile?.name,
                                );
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors shrink-0 shadow-2xs"
                              title="Open Resume in new tab"
                            >
                              <FileText className="h-3 w-3 text-indigo-600" />
                              Resume
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Candidate Evaluation & Decision Drawer */}
      {selectedApp && (
        <CandidateSheet
          applicationId={selectedApp.id}
          planId={selectedApp.hiringPlanId}
          mandateId={mandateId}
          mandateTitle={mandateTitle}
          onClose={() => setSelectedApp(null)}
          onUpdated={() => {
            fetchPipeline();
            onUpdated?.();
          }}
        />
      )}

      {/* Video Interview Modal */}
      {videoTarget && (
        <ScheduleVideoModal
          isOpen={true}
          onClose={() => setVideoTarget(null)}
          defaultEmail={videoTarget.candidateProfile.email}
          defaultName={videoTarget.candidateProfile.name}
          mandateId={mandateId}
          applicationId={videoTarget.id}
          pipelineStageId={videoTarget.currentStage?.id}
        />
      )}

      {/* Assessment Picker Modal */}
      {assessmentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Send Assessment Invite
                </h3>
                <p className="text-xs text-slate-500">
                  Select an assessment for {assessmentTarget.candidateProfile.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssessmentTarget(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingAssessments ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading assessments...
              </div>
            ) : assessments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center space-y-3">
                <p className="text-xs text-slate-600">
                  No assessments have been created yet.
                </p>
                <Link
                  href="/assessments/create"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Assessment
                </Link>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {assessments.map((assess) => (
                  <button
                    key={assess.id}
                    type="button"
                    onClick={() => {
                      const target = assessmentTarget;
                      setAssessmentTarget(null);
                      setInviteCandidate(target);
                      setSelectedAssessment(assess);
                    }}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {assess.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {assess.type} · {assess.durationMinutes} min
                        {assess.mandate?.title ? ` · ${assess.mandate.title}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 shrink-0 ml-2">
                      Invite →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assessment Invite Modal */}
      {selectedAssessment && inviteCandidate && (
        <InviteModal
          assessment={selectedAssessment}
          isOpen={true}
          onClose={() => {
            setSelectedAssessment(null);
            setInviteCandidate(null);
          }}
          defaultCandidateEmail={inviteCandidate.candidateProfile.email}
          defaultCandidateName={inviteCandidate.candidateProfile.name}
          applicationId={inviteCandidate.id}
        />
      )}
    </div>
  );
}
