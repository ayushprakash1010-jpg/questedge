"use client";

import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/marketplace-api";
import { Loader2, ArrowLeft, Briefcase, Building2, MapPin, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

function ReferralProgressBar({ status }: { status: string }) {
  const steps = [
    { label: "Accepted", states: ["CANDIDATE_ACCEPTED", "ACTIVATED"] },
    { label: "Under Review", states: ["UNDER_REVIEW", "SHORTLISTED"] },
    { label: "Interview", states: ["INTERVIEW"] },
    { label: "Selected", states: ["SELECTED", "HIRED"] },
  ];

  // Map backend status to a logical index
  let currentIndex = 0;
  if (steps[3].states.includes(status) || status === "REJECTED") currentIndex = 3;
  else if (steps[2].states.includes(status)) currentIndex = 2;
  else if (steps[1].states.includes(status)) currentIndex = 1;
  
  const isRejected = status === "REJECTED";

  return (
    <div className="w-full mt-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-slate-100 rounded-full" />
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full transition-all ${isRejected ? 'bg-red-400' : 'bg-emerald-500'}`} 
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          
          let circleColor = "bg-slate-200 border-slate-300";
          if (isCompleted) circleColor = isRejected && isCurrent ? "bg-red-500 border-red-500" : "bg-emerald-500 border-emerald-500";
          if (isCurrent && !isRejected) circleColor = "bg-white border-emerald-500 ring-2 ring-emerald-100";

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={`w-4 h-4 rounded-full border-2 ${circleColor} transition-colors`} />
              <span className={`text-[11px] font-medium ${isCurrent ? (isRejected ? 'text-red-600' : 'text-emerald-700') : (isCompleted ? 'text-slate-700' : 'text-slate-400')}`}>
                {isRejected && isCurrent ? "Rejected" : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ applications: any[]; referrals: any[] }>({ applications: [], referrals: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const res = await getMyApplications(accessToken);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = data.applications.length + data.referrals.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/candidate/dashboard")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Applications & Referrals</h1>
              <p className="text-sm text-slate-500 mt-1">Track the status of your direct applications and accepted referrals.</p>
            </div>
            {total > 0 && (
              <span className="bg-emerald-100 text-emerald-700 font-semibold text-sm px-3 py-1.5 rounded-full">
                {total} Active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : total === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No active applications</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              You haven't applied to any jobs or accepted any referrals yet.
            </p>
            <Link
              href="/candidate/jobs"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Browse Open Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Direct Applications */}
            {data.applications.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Direct Applications</h2>
                <div className="space-y-4">
                  {data.applications.map((app) => (
                    <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 shrink-0">
                        {app.mandate?.organization?.name?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{app.mandate?.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" /> {app.mandate?.organization?.name}
                              </span>
                              {app.mandate?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> {app.mandate.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Status: {app.status}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          Applied {formatDistanceToNow(new Date(app.appliedAt))} ago
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Referrals */}
            {data.referrals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 mt-8">Accepted Referrals</h2>
                <div className="space-y-4">
                  {data.referrals.map((ref) => (
                    <div key={ref.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-600 shrink-0">
                        {ref.mandate?.organization?.name?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{ref.mandate?.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" /> {ref.mandate?.organization?.name}
                              </span>
                              {ref.mandate?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> {ref.mandate.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                              Status: {ref.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <ReferralProgressBar status={ref.status} />
                        <div className="mt-5 bg-slate-50 rounded-xl p-3 border border-slate-100 inline-block">
                          <p className="text-xs font-semibold text-slate-500 mb-1">Referred by</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                              {ref.recruiter?.name?.[0] ?? "R"}
                            </div>
                            <span className="text-sm font-medium text-slate-800">{ref.recruiter?.name}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          Updated {formatDistanceToNow(new Date(ref.updatedAt))} ago
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
