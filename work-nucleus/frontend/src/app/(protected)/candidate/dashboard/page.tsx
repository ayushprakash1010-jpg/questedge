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

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, gradient, sub }: {
  label: string; value: number | string; icon: any; gradient: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient} shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
        </div>
        <div className="bg-white/20 rounded-xl p-2.5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-6 py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-64 h-64 rounded-full bg-white" />
          <div className="absolute -bottom-12 -left-4 w-40 h-40 rounded-full bg-white" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-emerald-200 text-sm font-medium mb-1">Candidate Portal</p>
              <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {profile.name} 👋</h1>
              <p className="text-emerald-100 mt-2 text-sm">
                {profile.headline || "Complete your profile to stand out to recruiters."}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Profile completion meter */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 min-w-[160px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-emerald-100">Profile strength</span>
                  <span className="text-xs font-bold text-white">{profileCompletion}%</span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <button
                  onClick={() => router.push("/candidate/profile")}
                  className="mt-2 text-xs text-emerald-200 hover:text-white transition-colors flex items-center gap-1"
                >
                  {profileCompletion < 100 ? "Complete profile" : "Edit profile"} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Pending Consents"
            value={consents.length}
            icon={Bell}
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            sub={consents.length > 0 ? "Action required" : "All clear"}
          />
          <StatCard
            label="Active Referrals"
            value={profile._count?.referrals ?? 0}
            icon={Users}
            gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
            sub="Recruiters working for you"
          />
          <StatCard
            label="Saved Jobs"
            value={savedJobs.length}
            icon={Bookmark}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            sub="Explore when ready"
          />
          <StatCard
            label="Applications"
            value={profile._count?.applications ?? 0}
            icon={FileText}
            gradient="bg-gradient-to-br from-sky-500 to-cyan-600"
            sub="Submitted so far"
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pending Consents */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="font-semibold text-slate-800">Pending Consent Requests</h3>
                  {consents.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {consents.length} new
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {consents.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="font-medium text-slate-700">You're all caught up!</p>
                    <p className="text-sm text-slate-400 mt-1">No pending referral consent requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consents.map((consent) => (
                      <ConsentCard
                        key={consent.id}
                        consent={consent}
                        onRespond={handleConsentResponse}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Profile completeness tips */}
            {profileCompletion < 100 && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
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
                    <button
                      onClick={() => router.push("/candidate/profile")}
                      className="mt-3 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      Complete Profile <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Saved Jobs + Profile preview */}
          <div className="space-y-6">
            {/* Saved Jobs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Saved Jobs</h3>
                <Link href="/candidate/jobs" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Browse all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="p-4 space-y-3">
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
              </div>
            </div>

            {/* Quick profile snapshot */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Your Profile</h3>
                <button
                  onClick={() => router.push("/candidate/profile")}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Experience", value: profile.experienceYears ? `${profile.experienceYears} years` : null, icon: Briefcase },
                  { label: "Location", value: profile.currentLocation, icon: MapPin },
                  { label: "Notice period", value: profile.noticePeriodDays ? `${profile.noticePeriodDays} days` : null, icon: Clock },
                  { label: "Work mode", value: profile.workModel, icon: TrendingUp },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-slate-500 w-24 shrink-0">{label}</span>
                    <span className={`font-medium truncate ${value ? "text-slate-800" : "text-slate-300 italic"}`}>
                      {value || "Not set"}
                    </span>
                  </div>
                ))}
                {profile.skills?.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Top Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 6).map((s: string) => (
                        <span key={s} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full border border-emerald-100">
                          {s}
                        </span>
                      ))}
                      {profile.skills.length > 6 && (
                        <span className="text-xs text-slate-400">+{profile.skills.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
