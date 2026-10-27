"use client";

import { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  MapPin,
  TrendingUp,
  Bookmark,
  ShieldCheck,
  Building2,
  Calendar,
  IndianRupee,
  Loader2,
} from "lucide-react";
import {
  MatchEvaluationResult,
  Mandate,
  getCandidateMandateMatch,
} from "@/lib/marketplace-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface AiMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandate: Mandate | null;
  onSave?: (id: string) => void;
  isSaved?: boolean;
  preloadedMatch?: MatchEvaluationResult | null;
}

export function AiMatchModal({
  isOpen,
  onClose,
  mandate,
  onSave,
  isSaved = false,
  preloadedMatch = null,
}: AiMatchModalProps) {
  const [match, setMatch] = useState<MatchEvaluationResult | null>(preloadedMatch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  useEffect(() => {
    if (!isOpen || !mandate) return;

    if (preloadedMatch) {
      setMatch(preloadedMatch);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getCandidateMandateMatch(accessToken, mandate.id);
        if (isMounted) {
          setMatch(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to calculate match score");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, mandate?.id, preloadedMatch]);

  if (!isOpen || !mandate) return null;

  const score = match?.matchScore ?? 0;
  const verdict = match?.verdict ?? "POTENTIAL_MATCH";

  const getVerdictBadge = () => {
    switch (verdict) {
      case "STRONG_MATCH":
        return {
          label: "Strong Match",
          gradient: "from-emerald-500 to-teal-600",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          barBg: "bg-emerald-500",
        };
      case "GOOD_MATCH":
        return {
          label: "Good Match",
          gradient: "from-blue-600 to-indigo-600",
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          barBg: "bg-blue-500",
        };
      case "POTENTIAL_MATCH":
        return {
          label: "Potential Match",
          gradient: "from-amber-500 to-orange-500",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          barBg: "bg-amber-500",
        };
      default:
        return {
          label: "Low Fit",
          gradient: "from-slate-500 to-slate-700",
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          barBg: "bg-slate-400",
        };
    }
  };

  const verdictConfig = getVerdictBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-match-modal-title"
        aria-describedby="ai-match-modal-description"
        tabIndex={-1}
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                AI Role Match Analysis
              </span>
              <span className="text-xs text-slate-400">
                {match?.isAiGenerated ? "Google Gemini 2.5 AI" : "Semantic Match Engine"}
              </span>
            </div>
            <h2 id="ai-match-modal-title" className="text-xl font-bold tracking-tight text-white">
              {mandate.title}
            </h2>
            <div id="ai-match-modal-description" className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {mandate.organization?.name || "Company"}
              </span>
              {mandate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {mandate.location} ({mandate.workModel || "Flexible"})
                </span>
              )}
              {mandate.referralRewardAmount && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {Number(mandate.referralRewardAmount).toLocaleString("en-IN")} Referral Reward
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close match analysis modal"
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600">
                Analyzing competency fit with Google Gemini AI...
              </p>
              <p className="text-xs text-slate-400">
                Evaluating skills, experience depth, notice period, and requirements
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm font-semibold text-red-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                }}
              >
                Retry Analysis
              </Button>
            </div>
          ) : match ? (
            <>
              {/* Score Summary Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 flex flex-col sm:flex-row items-center gap-5">
                {/* Radial Gauge */}
                <div className="relative flex items-center justify-center shrink-0 w-28 h-28 rounded-full bg-white shadow-md border border-slate-100">
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {score}%
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Match Fit
                    </span>
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${verdictConfig.bg}`}
                    >
                      {verdictConfig.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      Evaluation score derived from verified qualifications
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {match.aiSummary}
                  </p>
                </div>
              </div>

              {/* 4 Score Breakdown Meters */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Competency Fit Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Skills Fit */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Skills Alignment</span>
                      <span className="font-bold text-slate-900">
                        {match.scoreBreakdown.skillsFit} / 40 pts
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(match.scoreBreakdown.skillsFit / 40) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Experience Fit */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Experience Depth</span>
                      <span className="font-bold text-slate-900">
                        {match.scoreBreakdown.experienceFit} / 25 pts
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(match.scoreBreakdown.experienceFit / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Role Fit */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Role & Domain Synergy</span>
                      <span className="font-bold text-slate-900">
                        {match.scoreBreakdown.roleDomainFit} / 20 pts
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(match.scoreBreakdown.roleDomainFit / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Preferences Fit */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Logistics & Notice Fit</span>
                      <span className="font-bold text-slate-900">
                        {match.scoreBreakdown.preferencesFit} / 15 pts
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(match.scoreBreakdown.preferencesFit / 15) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched vs Missing Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Matched Skills ({match.matchedSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {match.matchedSkills.length > 0 ? (
                      match.matchedSkills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-emerald-700 border border-emerald-200 shadow-2xs"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None detected</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Missing / Desired Skills ({match.missingSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {match.missingSkills.length > 0 ? (
                      match.missingSkills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-amber-800 border border-amber-200 shadow-2xs"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium">
                        All mandatory requirements satisfied!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Strengths & Growth Areas */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Evaluation Insights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Key Strengths
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      {match.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Areas for Consideration
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      {match.gaps.length > 0 ? (
                        match.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{gap}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-emerald-600 font-medium">
                          No significant qualification gaps identified.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onSave && (
              <Button
                variant={isSaved ? "outline" : "default"}
                size="sm"
                onClick={() => onSave(mandate.id)}
                className={isSaved ? "text-slate-600" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
              >
                <Bookmark className="h-4 w-4 mr-1.5" />
                {isSaved ? "Saved ✓" : "Save Job"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
