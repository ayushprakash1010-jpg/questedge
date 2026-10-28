"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getMandate,
  joinMandate,
  leaveMandate,
  getRecruiterTalentPoolMatches,
  runPreflightMatchCheck,
  Mandate,
  CandidateMatchItem,
  MatchEvaluationResult,
} from "@/lib/marketplace-api";
import { MandateStatusBadge, RewardBadge, SkillChip } from "@/components/marketplace/MandateCard";
import {
  Loader2,
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  CheckCircle2,
  UserPlus,
  X,
  Sparkles,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

export default function RecruiterMandateDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Talent Pool State
  const [talentMatches, setTalentMatches] = useState<CandidateMatchItem[]>([]);
  const [talentLoading, setTalentLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    recruiterNote: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Preflight AI check state
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightResult, setPreflightResult] = useState<MatchEvaluationResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getMandate(accessToken, id);
        setMandate({ ...data, isJoined: false });

        // Load AI matched talent pool in background
        setTalentLoading(true);
        try {
          const pool = await getRecruiterTalentPoolMatches(accessToken, id, 6);
          setTalentMatches(pool);
        } catch (e) {
          console.error("Failed to load talent pool matches:", e);
        } finally {
          setTalentLoading(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleQuickRefer = (item: CandidateMatchItem) => {
    setFormData({
      candidateName: item.candidate.name,
      candidateEmail: item.candidate.email,
      candidatePhone: "",
      recruiterNote: `Referred based on verified qualifications in ${item.match.matchedSkills.slice(0, 3).join(", ")}. Gemini AI Match: ${item.match.matchScore}%.`,
    });
    setPreflightResult(item.match);
    setIsModalOpen(true);
  };

  const handleRunPreflightCheck = async () => {
    if (!formData.candidateName.trim()) {
      toast.error("Please enter a candidate name to check match");
      return;
    }
    setPreflightLoading(true);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const res = await runPreflightMatchCheck(accessToken, {
        mandateId: id,
        candidateName: formData.candidateName.trim(),
        candidateEmail: formData.candidateEmail.trim() || undefined,
      });
      setPreflightResult(res);
      toast.success(`AI Match calculated: ${res.matchScore}%`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to calculate pre-flight match");
    } finally {
      setPreflightLoading(false);
    }
  };

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${API_URL}/api/v1/referrals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mandateId: id,
          ...formData,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error("Failed to submit referral. Server returned an invalid response.");
        }
        const message = errorData?.error?.message || errorData?.message || "Failed to submit referral";
        throw new Error(message);
      }

      setSubmitSuccess(true);
      toast.success("Consent request sent successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ candidateName: "", candidateEmail: "", candidatePhone: "", recruiterNote: "" });
        setPreflightResult(null);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message || "Failed to submit referral.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (!mandate) return <div>Mandate not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 relative pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-sky-600 transition-colors mb-4 flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Discover
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-500 font-medium flex items-center gap-1">
                  <Building2 className="h-4 w-4" /> {mandate.organization.name}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">{mandate.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                {mandate.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {mandate.location}
                  </span>
                )}
                {mandate.workModel && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    {mandate.workModel}
                  </span>
                )}
                <MandateStatusBadge status={mandate.status} />
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              {mandate.referralRewardAmount && (
                <RewardBadge amount={mandate.referralRewardAmount} currency={mandate.currency} />
              )}
              <Button
                onClick={() => {
                  setPreflightResult(null);
                  setIsModalOpen(true);
                }}
                size="lg"
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-md gap-2 w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                Refer a Candidate
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="font-semibold text-slate-900 text-lg mb-4">Job Description</h3>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
              {mandate.description}
            </div>
          </div>

          {/* ── AI Talent Pool Matcher Section ──────────────────────── */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-xl border border-indigo-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    AI Talent Matcher for this Mandate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidates from your talent network evaluated by Google Gemini 2.5
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {talentMatches.length} Found
              </span>
            </div>

            {talentLoading ? (
              <div className="py-8 text-center flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span>Evaluating talent network against mandate requirements...</span>
              </div>
            ) : talentMatches.length === 0 ? (
              <div className="p-6 rounded-lg bg-white/70 border border-slate-200/60 text-center">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No candidates in your network yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                  As you refer candidates and build your talent pool, Google Gemini AI will automatically surface top matches here.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Refer Candidate Directly
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {talentMatches.map((item) => (
                  <div
                    key={item.candidate.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.candidate.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {item.candidate.headline || item.candidate.currentDesignation || "Talent Pool Member"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border ${
                            item.match.matchScore >= 80
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.match.matchScore >= 65
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {item.match.matchScore}%
                        </span>
                      </div>

                      {/* Skill tags */}
                      <div className="flex flex-wrap gap-1">
                        {item.match.matchedSkills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {item.candidate.experienceYears ? `${item.candidate.experienceYears} yrs exp` : "Experienced"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleQuickRefer(item)}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                      >
                        Refer Candidate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="font-semibold text-slate-900 mb-4">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {mandate.mandatorySkills.map((s) => (
                <SkillChip key={s} skill={s} />
              ))}
            </div>
          </div>

          {(mandate.hiringManagerName || mandate.teamDescription) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="font-semibold text-slate-900 mb-4">Team & Reporting</h3>
              {mandate.hiringManagerName && (
                <div className="mb-4">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Reports To
                  </span>
                  <div className="font-medium text-slate-900">{mandate.hiringManagerName}</div>
                  {mandate.hiringManagerTitle && (
                    <div className="text-sm text-slate-500">{mandate.hiringManagerTitle}</div>
                  )}
                </div>
              )}
              {mandate.teamDescription && (
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    About the Team
                  </span>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap">{mandate.teamDescription}</div>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-100/70 rounded-xl border border-slate-200 p-6 text-center shadow-2xs">
            <h3 className="font-semibold text-slate-800 mb-2">Referral Actions</h3>
            <p className="text-sm text-slate-500 mb-4">
              Submit qualified candidates to initiate the candidate consent process and lock 48h ownership.
            </p>
            <Button
              onClick={() => {
                setPreflightResult(null);
                setIsModalOpen(true);
              }}
              variant="outline"
              className="w-full bg-white border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              Submit Candidate Referral
            </Button>
          </div>
        </div>
      </div>

      {/* Referral Submission Modal with AI Pre-flight Checker */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Refer a Candidate</h3>
                  <p className="text-xs text-slate-500">For {mandate.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {submitSuccess ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Referral Submitted!</h4>
                  <p className="text-sm text-slate-500 text-center">
                    An email has been dispatched to the candidate for consent. 48-hour ownership lock is now active.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReferralSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Candidate Full Name
                    </label>
                    <Input
                      required
                      placeholder="Jane Doe"
                      value={formData.candidateName}
                      onChange={(e) =>
                        setFormData({ ...formData, candidateName: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Candidate Email
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="jane@example.com"
                      value={formData.candidateEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, candidateEmail: e.target.value })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">We'll send the secure consent link here.</p>
                  </div>

                  {/* Preflight AI Match Card */}
                  {preflightResult ? (
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          AI Match Score: {preflightResult.matchScore}%
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-100">
                          {preflightResult.verdict.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{preflightResult.aiSummary}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRunPreflightCheck}
                      disabled={preflightLoading}
                      className="w-full py-2 px-3 rounded-lg border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {preflightLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                      Check AI Fit Before Submitting
                    </button>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={formData.candidatePhone}
                      onChange={(e) =>
                        setFormData({ ...formData, candidatePhone: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Recruiter Pitch Note <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[75px]"
                      placeholder="Why is this candidate an exceptional fit for this mandate?..."
                      value={formData.recruiterNote}
                      onChange={(e) =>
                        setFormData({ ...formData, recruiterNote: e.target.value })
                      }
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                      {submitError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white mt-4 font-semibold"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {submitting ? "Submitting..." : "Send Consent Request"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
