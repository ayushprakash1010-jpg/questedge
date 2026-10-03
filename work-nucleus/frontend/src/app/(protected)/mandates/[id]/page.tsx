"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMandate, Mandate } from "@/lib/marketplace-api";
import { MandateStatusBadge, RewardBadge, SkillChip } from "@/components/marketplace/MandateCard";
import {
  Loader2,
  ArrowLeft,
  Users,
  FileText,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineKanban } from "./PipelineKanban";

export default function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "description">("pipeline");

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!mandate) return <div>Mandate not found</div>;

  return (
    <div className="min-h-screen bg-slate-50">
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
          {/* Referral Inbox shortcut button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/mandates/${id}/referrals`)}
            className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex-shrink-0"
          >
            <Inbox className="h-4 w-4" />
            Referral Inbox
            {(mandate._count?.referrals ?? 0) > 0 && (
              <span className="ml-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {mandate._count?.referrals}
              </span>
            )}
          </Button>
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}
