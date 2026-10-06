"use client";

import { useEffect, useState } from "react";
import { getCandidateProfile, getPendingConsents, getSavedJobs } from "@/lib/marketplace-api";
import {
  Loader2, AlertCircle, FileText, Bookmark, Users, ArrowRight,
  CheckCircle2, XCircle, Clock, MapPin, Building2, Briefcase,
  TrendingUp, UserCircle, ChevronRight, Sparkles, Bell, Eye,
  Zap, Shield, Star, Target
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";
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
    <div className="min-h-screen bg-slate-50">
      {/* ── Premium Dark Hero Banner ────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 px-6 py-10 md:py-14">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-slate-900 to-slate-900" />
        <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute right-0 bottom-0 h-[200px] w-[200px] rounded-full bg-teal-500/10 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Candidate Portal</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{profile.name}</span> 👋
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl">
                {profile.headline || "Complete your profile to stand out to recruiters and get referred to top companies."}
              </p>
            </div>

            {/* Glassmorphic Profile Strength Card */}
            <div className="w-full md:w-auto">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 blur opacity-40 group-hover:opacity-70 transition duration-500" />
                <div className="relative bg-slate-900/80 backdrop-blur-md rounded-xl ring-1 ring-white/10 p-5 min-w-[200px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Profile Strength</span>
                    <span className={`text-sm font-bold ${profileCompletion >= 80 ? 'text-emerald-400' : profileCompletion >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {profileCompletion}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        profileCompletion >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                        profileCompletion >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                        'bg-gradient-to-r from-red-500 to-orange-400'
                      }`}
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  <button
                    onClick={() => router.push("/candidate/profile")}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
                  >
                    {profileCompletion < 100 ? "Complete profile" : "Edit profile"} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-10 relative z-10">
          {[
            { title: "Pending Consents", value: consents.length, icon: Bell, color: "amber", sub: consents.length > 0 ? "Action required" : "All clear" },
            { title: "Active Referrals", value: profile._count?.referrals ?? 0, icon: Users, color: "indigo", sub: "Recruiters working for you" },
            { title: "Saved Jobs", value: savedJobs.length, icon: Bookmark, color: "rose", sub: "Explore when ready" },
            { title: "Applications", value: profile._count?.applications ?? 0, icon: FileText, color: "cyan", sub: "Submitted so far" },
          ].map(({ title, value, icon: Icon, color, sub }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-8 -mt-8 opacity-30 group-hover:opacity-50 transition-opacity bg-${color}-200`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-50`}>
                    <Icon className={`h-4 w-4 text-${color}-500`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{sub}</p>
              </div>
            </div>
          ))}
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
                  <div className="text-center py-12">
                    <div className="relative mx-auto w-20 h-20 mb-4">
                      <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-6 opacity-60" />
                      <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border border-emerald-100">
                        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                      </div>
                    </div>
                    <p className="font-semibold text-slate-800 text-base">You're all caught up!</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">No pending referral consent requests. Browse jobs to get discovered by recruiters.</p>
                    <button
                      onClick={() => router.push("/candidate/jobs")}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <Target className="h-4 w-4" />
                      Browse open positions
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
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

            {/* Premium Boost Profile CTA */}
            {profileCompletion < 100 && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 border border-slate-700/50 shadow-xl">
                {/* Background decorative elements */}
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-[60px]" />
                <div className="absolute -left-5 -bottom-5 w-32 h-32 rounded-full bg-teal-500/10 blur-[50px]" />
                
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-lg mb-1">Boost your profile</h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Profiles with complete information are <span className="text-emerald-400 font-semibold">3x more likely</span> to be referred by top recruiters.
                    </p>
                    <div className="space-y-2 mb-5">
                      {getMissingFields(profile).slice(0, 3).map((field) => (
                        <div key={field} className="flex items-center gap-2.5 text-sm text-slate-300">
                          <div className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          Add your {field}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push("/candidate/profile")}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                    >
                      Complete Profile <ArrowRight className="h-4 w-4" />
                    </button>
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
                    <div className="relative mx-auto w-14 h-14 mb-3">
                      <div className="absolute inset-0 bg-slate-100 rounded-2xl rotate-3" />
                      <div className="relative w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200">
                        <Bookmark className="h-6 w-6 text-slate-300" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-600">No saved jobs yet</p>
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
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-50" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Your Profile</h3>
                  <button
                    onClick={() => router.push("/candidate/profile")}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
                <div className="space-y-3">
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
