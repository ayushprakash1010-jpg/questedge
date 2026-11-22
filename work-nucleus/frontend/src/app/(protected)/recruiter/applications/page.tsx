"use client";

import { useEffect, useState, useCallback } from "react";
import { getMyApplications } from "@/lib/marketplace-api";
import {
  Loader2,
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Sparkles,
  Globe,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CardGridSkeleton } from "@/components/ui/skeleton-states";
import { MarketplaceEmptyState } from "@/components/ui/marketplace-empty-state";
import { ErrorBanner } from "@/components/ui/error-state";

function ApplicationProgressBar({ status }: { status: string }) {
  const steps = [
    { label: "Submitted", states: ["ACTIVE"] },
    { label: "Under Review", states: ["UNDER_REVIEW", "SHORTLISTED"] },
    { label: "Interview", states: ["INTERVIEW"] },
    { label: "Selected", states: ["SELECTED", "HIRED"] },
  ];

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
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full transition-all ${
            isRejected ? "bg-red-400" : "bg-sky-500"
          }`}
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          let circleColor = "bg-slate-200 border-slate-300";
          if (isCompleted)
            circleColor =
              isRejected && isCurrent
                ? "bg-red-500 border-red-500"
                : "bg-sky-500 border-sky-500";
          if (isCurrent && !isRejected)
            circleColor = "bg-white border-sky-500 ring-2 ring-sky-100";

          return (
            <div
              key={step.label}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <div
                className={`w-4 h-4 rounded-full border-2 ${circleColor} transition-colors`}
              />
              <span
                className={`text-[11px] font-medium ${
                  isCurrent
                    ? isRejected
                      ? "text-red-600"
                      : "text-sky-700 font-bold"
                    : isCompleted
                    ? "text-slate-700"
                    : "text-slate-400"
                }`}
              >
                {isRejected && isCurrent ? "Rejected" : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ applications: any[]; referrals: any[] }>({
    applications: [],
    referrals: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const res = await getMyApplications(accessToken);
      setData(res || { applications: [], referrals: [] });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load your applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const apps = data.applications || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Direct Applications
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track the status and progress of mandate positions you have applied for directly.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchApplications} />}

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : apps.length === 0 ? (
        <MarketplaceEmptyState
          preset="applications"
          title="No Direct Applications Yet"
          description="You haven't applied to any mandate positions yet. Browse open mandates on the platform or explore market opportunities."
          primaryAction={{
            label: "Discover Mandates",
            onClick: () => router.push("/recruiter/discover"),
          }}
          secondaryAction={{
            label: "Explore Market",
            onClick: () => router.push("/recruiter/external-jobs"),
          }}
        />
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-base">
                      {app.mandate?.title || "Role Application"}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Direct Application
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {app.mandate?.organization?.name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {app.mandate.organization.name}
                      </span>
                    )}
                    {app.mandate?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {app.mandate.location}
                      </span>
                    )}
                    {app.appliedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.mandate?.id && (
                    <Link
                      href={`/recruiter/mandates/${app.mandate.id}`}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                    >
                      View Mandate &rarr;
                    </Link>
                  )}
                </div>
              </div>

              {app.coverLetter && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-100">
                  <p className="font-medium text-slate-700 mb-0.5">Your Note / Cover Letter:</p>
                  <p className="line-clamp-2">{app.coverLetter}</p>
                </div>
              )}

              <ApplicationProgressBar status={app.status || "ACTIVE"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
