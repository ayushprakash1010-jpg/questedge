"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Code2,
  FileText,
  ShieldAlert,
  Loader2,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  fetchAssessment,
  fetchAssessmentAnalytics,
  fetchAttemptResults,
  HiringAssessment,
} from "@/lib/assessment-api";

export default function AssessmentAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;

  const [assessment, setAssessment] = useState<HiringAssessment | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [attemptDetails, setAttemptDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [assess, stats] = await Promise.all([
        fetchAssessment(id),
        fetchAssessmentAnalytics(id),
      ]);
      setAssessment(assess);
      setAnalytics(stats);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const viewAttemptScorecard = async (attemptId: string) => {
    setSelectedAttempt(attemptId);
    setIsLoadingDetails(true);
    try {
      const res = await fetchAttemptResults(attemptId);
      setAttemptDetails(res);
    } catch (err) {
      console.error("Failed to load attempt details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading evaluation analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <Link
        href={`/assessments/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assessment Editor
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Performance Analytics & Proctoring Log
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {assessment?.title} &bull; Cutoff: {assessment?.passingPercentage}% &bull;{" "}
          {assessment?.type} format
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Evaluations Completed
            </span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {analytics?.totalAttempts || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Candidates submitted</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pass Rate
            </span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {analytics?.passRate || 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {analytics?.passed || 0} passed / {analytics?.failed || 0} failed
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Score
            </span>
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">
            {analytics?.averageScore || 0} pts
          </div>
          <div className="text-xs text-slate-400 mt-1">
            ~{analytics?.averagePercentage || 0}% average fit
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Proctoring Status
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Enforced</div>
          <div className="text-xs text-amber-600 mt-1">Tab switches tracked</div>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Candidate Attempt Scorecards</h3>
          <span className="text-xs text-slate-400">
            {analytics?.attempts?.length || 0} total records
          </span>
        </div>

        {!analytics?.attempts || analytics.attempts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No candidates have completed this assessment yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Candidate</th>
                  <th className="py-3 px-4">Score / Max</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Tab Switches</th>
                  <th className="py-3 px-4">Fullscreen Exits</th>
                  <th className="py-3 px-4">Completed At</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {analytics.attempts.map((att: any) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">
                        {att.candidateProfile?.name || "Candidate"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {att.candidateProfile?.email || "No email"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {att.score} / {analytics?.totalPoints || assessment?.totalPoints || 100} pts ({Number(att.percentage).toFixed(1)}%)
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.passed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {att.passed ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> PASSED
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> FAILED
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          att.tabSwitchCount > 2 ? "text-rose-600 font-bold" : "text-slate-600"
                        }`}
                      >
                        {att.tabSwitchCount || 0} times
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {att.fullscreenExits || 0} times
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {att.completedAt
                        ? new Date(att.completedAt).toLocaleString()
                        : "In Progress"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => viewAttemptScorecard(att.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attempt Details Modal / Drawer */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Evaluation Scorecard & Audit</h3>
              <button
                onClick={() => {
                  setSelectedAttempt(null);
                  setAttemptDetails(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs">Loading candidate responses...</p>
              </div>
            ) : attemptDetails ? (
              <div className="space-y-4 text-xs">
                {/* Summary bar */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-slate-400 block font-semibold">Total Score</span>
                    <span className="text-lg font-bold text-slate-800">
                      {attemptDetails.score} / {attemptDetails.assessment?.totalPoints}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Percentage</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {Number(attemptDetails.percentage).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Proctoring Flags</span>
                    <span className="text-lg font-bold text-amber-600">
                      {attemptDetails.tabSwitchCount || 0} tabs
                    </span>
                  </div>
                </div>

                {/* Responses or Code Submissions */}
                {attemptDetails.assessment?.type === "QUIZ" && attemptDetails.responses && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">Question Responses</h4>
                    {attemptDetails.responses.map((r: any, idx: number) => (
                      <div
                        key={r.id || idx}
                        className={`p-3 rounded-xl border ${
                          r.isCorrect
                            ? "border-emerald-200 bg-emerald-50/50"
                            : "border-rose-200 bg-rose-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="text-slate-800">Q{idx + 1}: {r.question?.text}</span>
                          <span className={r.isCorrect ? "text-emerald-700" : "text-rose-700"}>
                            {r.isCorrect ? "✓ Correct" : "✗ Incorrect"} (+{r.pointsEarned} pts)
                          </span>
                        </div>
                        {r.question?.explanation && (
                          <p className="text-slate-500 mt-1 italic">
                            Explanation: {r.question.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {attemptDetails.assessment?.type === "CODING" &&
                  attemptDetails.codeSubmissions && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 text-sm">Submitted Code</h4>
                      {attemptDetails.codeSubmissions.map((sub: any, idx: number) => (
                        <div
                          key={sub.id || idx}
                          className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                            <span className="text-indigo-400 font-bold">
                              {sub.challenge?.title || `Challenge ${idx + 1}`}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              Score: {sub.score} / {sub.challenge?.maxScore} pts
                            </span>
                          </div>
                          <pre className="text-xs overflow-x-auto text-slate-300">
                            {sub.sourceCode}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

