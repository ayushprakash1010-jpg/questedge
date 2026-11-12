"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuestEdgeLogo } from "@/components/QuestEdgeLogo";
import {
  Code2,
  FileQuestion,
  Clock,
  Award,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { fetchCandidateAttempt, startCandidateAttempt, AssessmentAttempt } from "@/lib/assessment-api";

export default function CandidateAssessmentLandingPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    fetchCandidateAttempt(token)
      .then((data) => setAttempt(data))
      .catch((err) => setError(err.message || "Failed to load assessment details"))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleStart = async () => {
    if (!acknowledged) {
      alert("Please check the box acknowledging the evaluation integrity policy.");
      return;
    }

    setIsStarting(true);
    try {
      await startCandidateAttempt(token);
      if (attempt?.assessment.type === "QUIZ") {
        router.push(`/assessment/${token}/quiz`);
      } else if (attempt?.assessment.type === "CODING") {
        router.push(`/assessment/${token}/code`);
      } else {
        router.push(`/assessment/${token}/quiz`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start assessment session");
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading your evaluation session...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-slate-200 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || "This evaluation session link is either expired, invalid, or already completed."}
          </p>
        </div>
      </div>
    );
  }

  if (attempt.status === "COMPLETED" || attempt.status === "TIMED_OUT") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Header */}
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur py-3 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QuestEdgeLogo size="sm" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 border-l border-slate-200">
              Evaluation Portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              {attempt.candidateProfile?.name || attempt.candidateProfile?.email || "Candidate"}
            </span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-slate-200 text-center space-y-5">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Assessment Completed</h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                You have already finished and submitted your responses for <strong>{attempt.assessment.title}</strong>.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => router.push(`/assessment/${token}/complete`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                View Submission & Score <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { assessment } = attempt;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <QuestEdgeLogo size="sm" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 border-l border-slate-200">
            Evaluation Portal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            {attempt.candidateProfile?.name || attempt.candidateProfile?.email ? `Candidate: ${attempt.candidateProfile?.name || attempt.candidateProfile?.email}` : "Proctored Candidate Session"}
          </span>
        </div>
      </header>

      <div className="flex-1 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-xl border border-slate-200 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              QuestEdge Evaluation
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {assessment.type === "CODING" ? "Engineering Challenge" : "Business Quiz"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {assessment.title}
          </h1>
          {assessment.description && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{assessment.description}</p>
          )}
        </div>

        {/* Assessment Attributes Grid */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> Time Limit
            </span>
            <span className="text-base font-extrabold text-slate-800">
              {assessment.durationMinutes} Minutes
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block flex items-center justify-center gap-1">
              <Award className="h-3 w-3" /> Pass Benchmark
            </span>
            <span className="text-base font-extrabold text-emerald-600">
              {assessment.passingPercentage}%
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">
              Total Points
            </span>
            <span className="text-base font-extrabold text-slate-800">
              {assessment.totalPoints} pts
            </span>
          </div>
        </div>

        {/* Anti-Cheat & Rules Box */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            Evaluation Rules & Proctoring Standards
          </div>
          <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc pl-5 leading-normal">
            <li>
              <strong>Fullscreen Enforcement:</strong> Exiting fullscreen mode is tracked and logged in your candidate scorecard.
            </li>
            <li>
              <strong>Tab Switch Detection:</strong> Switching away from this browser tab will be logged and can cause disqualification.
            </li>
            <li>
              <strong>Single Session:</strong> Once started, the timer cannot be paused. Ensure you have {assessment.durationMinutes} minutes of uninterrupted time.
            </li>
            <li>
              <strong>Auto-Submission:</strong> If the timer expires, all current answers are automatically submitted.
            </li>
          </ul>
        </div>

        {/* Instructions */}
        {assessment.instructions && (
          <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">Company Instructions:</span>
            {assessment.instructions}
          </div>
        )}

        {/* Confirmation Checkbox */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="text-xs text-slate-700 leading-normal">
              I agree to abide by the evaluation integrity policy. I understand that tab switches, copy-pasting, and window focus changes are actively recorded.
            </span>
          </label>

          <button
            onClick={handleStart}
            disabled={!acknowledged || isStarting}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Starting Secure Session...
              </>
            ) : (
              <>
                Start Assessment Now <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

