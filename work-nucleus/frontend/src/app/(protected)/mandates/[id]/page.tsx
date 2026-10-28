"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMandate, fillMandate, closeMandate, Mandate } from "@/lib/marketplace-api";
import { MandateStatusBadge, RewardBadge, SkillChip } from "@/components/marketplace/MandateCard";
import {
  Loader2,
  ArrowLeft,
  Users,
  FileText,
  CheckCircle2,
  Inbox,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineKanban } from "./PipelineKanban";

export default function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "description">("pipeline");
  const [actionLoading, setActionLoading] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getMandate(accessToken, id);
        setMandate(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleFill = async () => {
    setActionLoading(true);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const updated = await fillMandate(accessToken, id);
      setMandate(updated);
      setShowFillModal(false);
      setActionMsg({
        text: "Mandate successfully marked as FILLED! Referral verification check-ins have been dispatched.",
        type: "ok",
      });
    } catch (err: any) {
      setActionMsg({ text: err?.message || "Failed to mark as filled.", type: "err" });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const updated = await closeMandate(accessToken, id);
      setMandate(updated);
      setShowCloseModal(false);
      setActionMsg({
        text: "Mandate has been CLOSED.",
        type: "ok",
      });
    } catch (err: any) {
      setActionMsg({ text: err?.message || "Failed to close mandate.", type: "err" });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!mandate) return <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">Mandate not found.</div>;

  const canMutate = mandate.status === "ACTIVE" || mandate.status === "PAUSED";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Alert */}
      {actionMsg && (
        <div
          className={`px-6 py-3 text-sm font-medium text-center ${
            actionMsg.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900 truncate">{mandate.title}</h1>
              <MandateStatusBadge status={mandate.status} />
            </div>
            <p className="text-sm text-slate-500">
              {mandate.department} · {mandate.location} · {mandate.workModel}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Referral Inbox shortcut button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/mandates/${id}/referrals`)}
              className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <Inbox className="h-4 w-4" />
              Referral Inbox
              {(mandate._count?.referrals ?? 0) > 0 && (
                <span className="ml-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {mandate._count?.referrals}
                </span>
              )}
            </Button>

            {/* Lifecycle actions */}
            {canMutate && (
              <>
                <Button
                  size="sm"
                  onClick={() => setShowFillModal(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="h-4 w-4" />
                  Mark as Filled
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseModal(true)}
                  className="gap-1.5 text-slate-600 hover:text-red-600 hover:border-red-200"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fill Confirmation Modal */}
      {showFillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3 text-emerald-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Mark Mandate as Filled?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Marking <strong>{mandate.title}</strong> as filled signals that your open headcount is met. Active candidate verification check-ins will be scheduled, and unselected referrals will be gracefully wrapped up.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFillModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFill}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading ? "Updating..." : "Yes, Mark as Filled"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Close Mandate?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to close <strong>{mandate.title}</strong>? Recruiters will no longer be able to submit referrals, and candidate check-ins will verify the hiring status of any candidates currently in process.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClose}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? "Closing..." : "Close Mandate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Tab switcher */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 w-fit">
            {(["pipeline", "description"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {tab === "pipeline" ? "Candidate Pipeline" : "Job Description"}
              </button>
            ))}
          </div>

          {activeTab === "pipeline" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Candidate Pipeline</h3>
                  <p className="text-sm text-slate-500">
                    Applications and accepted referrals in your pipeline.
                  </p>
                </div>
              </div>
              <PipelineKanban mandateId={id} />
            </div>
          )}

          {activeTab === "description" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Job Description</h3>
              <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                {mandate.description}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Referral Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-sky-500" /> Total Referrals
                </span>
                <span className="font-bold text-slate-900">
                  {mandate._count?.referrals || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 text-violet-500" /> Direct Apps
                </span>
                <span className="font-bold text-slate-900">
                  {mandate._count?.applications || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Active Recruiters
                </span>
                <span className="font-bold text-emerald-700">
                  {mandate._count?.participations || 0}
                </span>
              </div>
            </div>

            {/* Quick link to referral inbox */}
            <button
              onClick={() => router.push(`/mandates/${id}/referrals`)}
              className="mt-4 w-full flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors group"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Inbox className="h-4 w-4" />
                Open Referral Inbox
              </span>
              <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Requirements</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {mandate.mandatorySkills.map((skill) => (
                <SkillChip key={skill} skill={skill} />
              ))}
            </div>
            {mandate.referralRewardAmount && (
              <RewardBadge
                amount={mandate.referralRewardAmount}
                currency={mandate.currency}
              />
            )}
          </div>

          {(mandate.hiringManagerName || mandate.teamDescription) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Team & Reporting</h3>
              {mandate.hiringManagerName && (
                <div className="mb-3">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reports To</span>
                  <div className="font-medium text-slate-900">{mandate.hiringManagerName}</div>
                  {mandate.hiringManagerTitle && (
                    <div className="text-sm text-slate-500">{mandate.hiringManagerTitle}</div>
                  )}
                </div>
              )}
              {mandate.teamDescription && (
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">About the Team</span>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap">{mandate.teamDescription}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
