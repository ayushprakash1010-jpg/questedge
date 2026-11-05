"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Award, Clock, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { fetchCandidateAttempt, AssessmentAttempt } from "@/lib/assessment-api";

export default function AssessmentCompletePage() {
  const params = useParams();
  const token = params.token as string;
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);

  useEffect(() => {
    fetchCandidateAttempt(token)
      .then((data) => setAttempt(data))
      .catch((err) => console.error("Error loading completed attempt:", err));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
            QE
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-sm">QuestEdge</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 border-l border-slate-200">
            Evaluation Portal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {attempt?.candidateProfile?.name || attempt?.candidateProfile?.email || "Candidate Completed"}
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-8 sm:p-10 shadow-xl border border-slate-200 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Evaluation Successfully Recorded
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Thank You for Submitting!
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Your evaluation responses and proctoring telemetry have been securely transmitted to the hiring team.
            </p>
          </div>

          {attempt && attempt.assessment?.showResults && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your Performance Score
              </div>
              <div className="text-3xl font-extrabold text-indigo-600">
                {attempt.score} <span className="text-sm font-semibold text-slate-400">/ {attempt.assessment.totalPoints} pts</span>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                Percentage: {Number(attempt.percentage).toFixed(1)}% &bull; Benchmark: {attempt.assessment.passingPercentage}%
              </div>
            </div>
          )}

          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-left text-xs text-indigo-900 space-y-1">
            <span className="font-bold block">What happens next?</span>
            <p className="text-indigo-800/80 leading-normal">
              The recruiting team will review your scorecard, coding execution logs, and fit metrics. You will be notified via email regarding next steps in the pipeline.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Return to QuestEdge Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

