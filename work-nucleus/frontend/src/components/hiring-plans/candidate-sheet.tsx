"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  X, Mail, Phone, Briefcase, Building2, Clock, Award,
  ChevronRight, Ban, Pause, Check, ArrowRight, MessageSquare, ClipboardEdit,
} from "lucide-react";
import { FeedbackDisplay } from "./feedback-display";
import { FeedbackForm } from "./feedback-form";
import { DecisionModal } from "./decision-modal";

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
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    source: string;
    currentCompany: string | null;
    currentRole: string | null;
    experienceYears: string | null;
    expectedCtc: string | null;
    noticePeriodDays: number | null;
    notes: string | null;
  };
  hiringPlan: { id: string; title: string; department: string; designation: string };
  currentStage: { id: string; name: string; stageType: string } | null;
  stageHistory: StageHistoryItem[];
}

const sourceColors: Record<string, string> = {
  REFERRAL: "bg-green-50 text-green-700",
  JOB_BOARD: "bg-blue-50 text-blue-700",
  DIRECT: "bg-slate-100 text-slate-700",
  AGENCY: "bg-purple-50 text-purple-700",
  INTERNAL: "bg-amber-50 text-amber-700",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-blue-50 text-blue-700",
  SELECTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  ON_HOLD: "bg-amber-50 text-amber-700",
  WITHDRAWN: "bg-slate-100 text-slate-700",
};

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
  const [stages, setStages] = useState<{ id: string; name: string; stageOrder: number; skillsToEvaluate?: any[] }[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "feedback" | "give-feedback">("overview");
  const [showDecisionModal, setShowDecisionModal] = useState(false);

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
        setStages(Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name, stageOrder: s.stageOrder })) : []);
      }
    } catch {
      // ignore
    }
  }, [planId]);

  useEffect(() => {
    fetchDetail();
    fetchStages();
  }, [fetchDetail, fetchStages]);

  const handleMoveToNext = async () => {
    if (!app?.currentStage) return;
    const currentOrder = stages.find((s) => s.id === app.currentStage!.id)?.stageOrder;
    if (currentOrder === undefined) return;
    const nextStage = stages.find((s) => s.stageOrder === currentOrder + 1);
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

  const hasNextStage = () => {
    if (!app?.currentStage) return false;
    const currentOrder = stages.find((s) => s.id === app.currentStage!.id)?.stageOrder;
    return currentOrder !== undefined && stages.some((s) => s.stageOrder === currentOrder + 1);
  };

  const isLastStage = () => {
    if (!app?.currentStage) return false;
    const currentOrder = stages.find((s) => s.id === app.currentStage!.id)?.stageOrder;
    const maxOrder = Math.max(...stages.map((s) => s.stageOrder));
    return currentOrder === maxOrder;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet */}
      <div className="w-full max-w-lg border-l border-slate-200 bg-white shadow-xl overflow-y-auto">
        {loading || !app ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{app.candidate.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", statusColors[app.status])}>
                    {app.status}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", sourceColors[app.candidate.source])}>
                    {app.candidate.source}
                  </Badge>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contact */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {app.candidate.email}
              </div>
              {app.candidate.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {app.candidate.phone}
                </div>
              )}
            </div>

            {/* Info cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {app.candidate.currentRole && (
                <InfoCard icon={<Briefcase className="h-4 w-4" />} label="Role" value={app.candidate.currentRole} />
              )}
              {app.candidate.currentCompany && (
                <InfoCard icon={<Building2 className="h-4 w-4" />} label="Company" value={app.candidate.currentCompany} />
              )}
              {app.candidate.experienceYears && (
                <InfoCard icon={<Clock className="h-4 w-4" />} label="Experience" value={`${app.candidate.experienceYears} yrs`} />
              )}
              {app.candidate.expectedCtc && (
                <InfoCard icon={<Award className="h-4 w-4" />} label="Expected CTC" value={`₹${Number(app.candidate.expectedCtc).toLocaleString()}`} />
              )}
              {app.candidate.noticePeriodDays !== null && (
                <InfoCard icon={<Clock className="h-4 w-4" />} label="Notice" value={`${app.candidate.noticePeriodDays} days`} />
              )}
            </div>

            {/* Current stage */}
            {app.currentStage && (
              <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                <p className="text-xs text-indigo-600">Current Stage</p>
                <p className="text-sm font-semibold text-indigo-900">{app.currentStage.name}</p>
              </div>
            )}

            {/* Action buttons */}
            {app.status === "ACTIVE" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {hasNextStage() && (
                  <Button size="sm" onClick={handleMoveToNext} disabled={acting}>
                    <ArrowRight className="mr-1 h-3 w-3" />
                    Move to Next Stage
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDecisionModal(true)}
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  Make Decision
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleStatus("ON_HOLD")} disabled={acting}>
                  <Pause className="mr-1 h-3 w-3" />
                  Put on Hold
                </Button>
              </div>
            )}

            {/* Decision info for decided candidates */}
            {(app.status === "SELECTED" || app.status === "REJECTED") && (
              <div className={cn(
                "mt-4 rounded-lg border px-3 py-2",
                app.status === "SELECTED" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              )}>
                <p className={cn("text-xs", app.status === "SELECTED" ? "text-green-600" : "text-red-600")}>
                  Decision: {app.status}
                </p>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="mt-5 flex gap-1 border-b border-slate-200">
              {[
                { key: "overview" as const, label: "Overview" },
                { key: "feedback" as const, label: "Feedback & Score", icon: <MessageSquare className="mr-1 h-3 w-3" /> },
                { key: "give-feedback" as const, label: "Give Feedback", icon: <ClipboardEdit className="mr-1 h-3 w-3" /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center px-3 py-2 text-xs font-medium transition-colors",
                    activeTab === tab.key
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Stage History Timeline */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-700">Stage History</h3>
                  <div className="mt-3 space-y-0">
                    {app.stageHistory.map((h, i) => {
                      const duration = h.exitedAt
                        ? Math.ceil((new Date(h.exitedAt).getTime() - new Date(h.enteredAt).getTime()) / (1000 * 60 * 60 * 24))
                        : Math.ceil((Date.now() - new Date(h.enteredAt).getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <div key={h.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "h-3 w-3 rounded-full border-2",
                                !h.exitedAt
                                  ? "border-indigo-600 bg-indigo-600"
                                  : h.outcome === "PASSED"
                                    ? "border-green-500 bg-green-500"
                                    : h.outcome === "REJECTED"
                                      ? "border-red-500 bg-red-500"
                                      : "border-slate-300 bg-slate-300"
                              )}
                            />
                            {i < app.stageHistory.length - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-200" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium text-slate-900">{h.stage.name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(h.enteredAt).toLocaleDateString()}
                              {h.exitedAt && ` → ${new Date(h.exitedAt).toLocaleDateString()}`}
                              {!h.exitedAt && " → now"}
                              {" · "}
                              {duration}d
                            </p>
                            {h.outcome && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "mt-1 text-xs",
                                  h.outcome === "PASSED" ? "text-green-700" : h.outcome === "REJECTED" ? "text-red-700" : "text-slate-500"
                                )}
                              >
                                {h.outcome}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Applied {new Date(app.appliedAt).toLocaleDateString()} · Plan: {app.hiringPlan.title}
                </p>

                {/* Reject Dialog */}
                {showRejectDialog && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-900">Reject Candidate</p>
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
                      <Button size="sm" variant="outline" onClick={() => setShowRejectDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Feedback & Score Tab */}
            {activeTab === "feedback" && (
              <div className="mt-4">
                <FeedbackDisplay
                  applicationId={app.id}
                  aiSummary={app.aiSummary}
                  totalScore={app.totalScore}
                />
              </div>
            )}

            {/* Give Feedback Tab */}
            {activeTab === "give-feedback" && app.currentStage && (
              <div className="mt-4">
                <FeedbackForm
                  applicationId={app.id}
                  stageId={app.currentStage.id}
                  stageName={app.currentStage.name}
                  candidateName={app.candidate.name}
                  roleName={app.hiringPlan.designation}
                  skills={[]}
                  onSubmitted={() => {
                    fetchDetail();
                    setActiveTab("feedback");
                  }}
                />
              </div>
            )}
            {activeTab === "give-feedback" && !app.currentStage && (
              <div className="mt-4 text-center text-sm text-slate-400">
                No active stage to provide feedback for.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Modal */}
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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <div className="flex items-center gap-1.5 text-slate-400">{icon}<span className="text-xs">{label}</span></div>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
