"use client";

import { useEffect, useState } from "react";
import { getCandidateProfile, getPendingConsents, getSavedJobs } from "@/lib/marketplace-api";
import {
  Loader2, AlertCircle, FileText, Bookmark, Users, ArrowRight,
  CheckCircle2, XCircle, Clock, MapPin, Building2, Briefcase,
  TrendingUp, UserCircle, ChevronRight, Sparkles, Bell, Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── Consent card ──────────────────────────────────────────────────

function ConsentCard({ consent, onRespond }: { consent: any; onRespond: (token: string, accepted: boolean) => void }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(consent.expiresAt).getTime() - Date.now()) / 86400000)
  );
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" /> {daysLeft}d left
            </span>
          </div>
          <h4 className="font-semibold text-slate-900 text-sm leading-tight">
            {consent.referral?.mandate?.title ?? "Job Opportunity"}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <Building2 className="h-3 w-3" />
            {consent.referral?.mandate?.organization?.name}
            {consent.referral?.mandate?.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                {consent.referral.mandate.location}
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Referred by <span className="font-medium text-slate-700">{consent.referral?.recruiter?.name}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onRespond(consent.consentToken, false)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-xs font-medium transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" /> Decline
        </button>
        <button
          onClick={() => onRespond(consent.consentToken, true)}
          className="flex-2 flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-sm"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Accept Referral
        </button>
      </div>
    </div>
  );
}

// ── Saved job card ────────────────────────────────────────────────

function SavedJobCard({ job }: { job: any }) {
  const mandate = job.mandate;
  if (!mandate) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-base font-bold text-slate-600">
        {mandate.organization?.name?.[0] ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 truncate">{mandate.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{mandate.organization?.name}</p>
        {mandate.referralRewardAmount && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            🏆 ₹{mandate.referralRewardAmount.toLocaleString()} referral reward
          </p>
        )}
      </div>
      <Link href={`/candidate/jobs`} className="shrink-0 text-slate-400 hover:text-emerald-600 transition-colors">
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();

        const [profileData, consentsData, savedData] = await Promise.allSettled([
          getCandidateProfile(accessToken),
          getPendingConsents(accessToken),
          getSavedJobs(accessToken),
        ]);

        if (profileData.status === "fulfilled") setProfile(profileData.value);
        else setError(true);

        if (consentsData.status === "fulfilled") setConsents(consentsData.value || []);
        if (savedData.status === "fulfilled") setSavedJobs(savedData.value || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConsentResponse = async (consentToken: string, accepted: boolean) => {
    setRespondingTo(consentToken);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      await fetch(`${apiUrl}/api/v1/candidate/consents/${consentToken}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accepted }),
      });

      // Remove from list
      setConsents((prev) => prev.filter((c) => c.consentToken !== consentToken));
      toast.success(accepted ? "Referral accepted!" : "Referral declined.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to respond to referral.");
    } finally {
      setRespondingTo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <UserCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to the Candidate Portal!</h2>
        <p className="text-slate-500 mb-8 max-w-md">
          Set up your profile once and get discovered by top recruiters. It only takes 2 minutes.
        </p>
        <button
          onClick={() => router.push("/candidate/profile")}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:shadow-emerald-300 hover:-translate-y-0.5"
        >
          <Sparkles className="h-5 w-5" />
          Build My Profile
        </button>
        <p className="text-xs text-slate-400 mt-4">Free forever · No spam</p>
      </div>
    );
  }

  const profileCompletion = calculateCompletion(profile);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${profile.name} 👋`}
        subtitle={profile.headline || "Complete your profile to stand out to recruiters."}
        eyebrow="Candidate Portal"
        actions={
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 min-w-[160px] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Profile strength</span>
                <span className="text-xs font-bold text-emerald-600">{profileCompletion}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <button
                onClick={() => router.push("/candidate/profile")}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 font-medium"
              >
                {profileCompletion < 100 ? "Complete profile" : "Edit profile"} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        }
      />

      <div className="space-y-8 pb-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Pending Consents"
            value={consents.length}
            icon={<Bell />}
            accent="amber"
            subValue={consents.length > 0 ? "Action required" : "All clear"}
          />
          <KpiCard
            title="Active Referrals"
            value={profile._count?.referrals ?? 0}
            icon={<Users />}
            accent="indigo"
            subValue="Recruiters working for you"
          />
          <KpiCard
            title="Saved Jobs"
            value={savedJobs.length}
            icon={<Bookmark />}
            accent="red"
            subValue="Explore when ready"
          />
          <KpiCard
            title="Applications"
            value={profile._count?.applications ?? 0}
            icon={<FileText />}
            accent="cyan"
            subValue="Submitted so far"
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pending Consents */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  {consents.length > 0 && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                  <CardTitle>Pending Consent Requests</CardTitle>
                  {consents.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
                      {consents.length} new
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {consents.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="font-medium text-slate-700">You're all caught up!</p>
                    <p className="text-sm text-slate-400 mt-1">No pending referral consent requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-2">
                    {consents.map((consent) => (
                      <ConsentCard
                        key={consent.id}
                        consent={consent}
                        onRespond={handleConsentResponse}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile completeness tips */}
            {profileCompletion < 100 && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-900 mb-1">Boost your profile</h4>
                    <p className="text-sm text-indigo-700 mb-3">
                      Profiles with complete information are <strong>3x more likely</strong> to be referred by top recruiters.
                    </p>
                    {getMissingFields(profile).slice(0, 3).map((field) => (
                      <div key={field} className="flex items-center gap-2 text-sm text-indigo-600 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Add your {field}
                      </div>
                    ))}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push("/candidate/profile")}
                      className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    >
                      Complete Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Saved Jobs + Profile preview */}
          <div className="space-y-6">
            {/* Saved Jobs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <CardTitle>Saved Jobs</CardTitle>
                <Link href="/candidate/jobs" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Browse all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Bookmark className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No saved jobs yet</p>
                    <Link href="/candidate/jobs" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
                      Browse open positions →
                    </Link>
                  </div>
                ) : (
                  savedJobs.slice(0, 4).map((job) => (
                    <SavedJobCard key={job.id} job={job} />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick profile snapshot */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 mb-4">
                <CardTitle>Your Profile</CardTitle>
                <button
                  onClick={() => router.push("/candidate/profile")}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Edit
                </button>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Experience", value: profile.experienceYears ? `${profile.experienceYears} years` : null, icon: Briefcase },
                  { label: "Location", value: profile.currentLocation, icon: MapPin },
                  { label: "Notice period", value: profile.noticePeriodDays ? `${profile.noticePeriodDays} days` : null, icon: Clock },
                  { label: "Work mode", value: profile.workModel, icon: TrendingUp },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                      <Icon className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <span className="text-slate-500 w-24 shrink-0">{label}</span>
                    <span className={`font-medium truncate ${value ? "text-slate-800" : "text-slate-300 italic"}`}>
                      {value || "Not set"}
                    </span>
                  </div>
                ))}
                {profile.skills?.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Top Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 6).map((s: string) => (
                        <span key={s} className="bg-slate-50 text-slate-700 text-xs px-2 py-0.5 rounded-full border border-slate-200">
                          {s}
                        </span>
                      ))}
                      {profile.skills.length > 6 && (
                        <span className="text-xs text-slate-400">+{profile.skills.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function calculateCompletion(profile: any): number {
  const fields = [
    profile.name, profile.headline, profile.phone,
    profile.currentCompany, profile.currentDesignation,
    profile.experienceYears, profile.currentLocation,
    profile.skills?.length > 0,
    profile.noticePeriodDays, profile.workModel,
    profile.currentCtc, profile.expectedCtc,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

function getMissingFields(profile: any): string[] {
  const missing: string[] = [];
  if (!profile.headline) missing.push("professional headline");
  if (!profile.currentDesignation) missing.push("current designation");
  if (!profile.skills?.length) missing.push("skills");
  if (!profile.experienceYears) missing.push("years of experience");
  if (!profile.currentLocation) missing.push("current location");
  if (!profile.expectedCtc) missing.push("expected CTC");
  if (!profile.noticePeriodDays) missing.push("notice period");
  if (!profile.workModel) missing.push("work model preference");
  return missing;
}
