"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Clock,
  Users,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import RankingTrigger, { type CandidateOption } from "@/components/hiring-plans/resume-ranking/RankingTrigger";
import RankedCandidateCard from "@/components/hiring-plans/resume-ranking/RankedCandidateCard";

interface RankingSession {
  id: string;
  status: string;
  candidateCount: number;
  poolSummary: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  createdBy: { name: string; email: string };
  topCandidate: string | null;
  topScore: number | null;
}

interface Mandate {
  id: string;
  title: string;
  department: string | null;
}

export default function RankingPage() {
  const params = useParams();
  const mandateId = params.id as string;

  const [tab, setTab] = useState<"new" | "history">("new");
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [sessions, setSessions] = useState<RankingSession[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch mandate info and candidates
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mandateRes, candidatesRes, sessionsRes] = await Promise.all([
        fetch(`/api/mandates/${mandateId}`),
        fetch(`/api/candidates?hiringPlanId=${mandateId}&limit=100`),
        fetch(`/api/resume-ranking/sessions/${mandateId}`),
      ]);

      if (mandateRes.ok) {
        const m = await mandateRes.json();
        setMandate({ id: m.id, title: m.title, department: m.department });
      }

      if (candidatesRes.ok) {
        const data = await candidatesRes.json();
        const candidateList = (data.data || data || []).map((c: any) => ({
          id: c.candidateProfileId || c.id,
          name: c.name || "Unknown",
          email: c.email || "",
          source: c.source || "DIRECT",
          hasResume: !!(c.resumeUrl),
        }));
        setCandidates(candidateList);
      }

      if (sessionsRes.ok) {
        const sessData = await sessionsRes.json();
        setSessions(sessData.data || []);
      }
    } catch (err) {
      console.error("Failed to load ranking data:", err);
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRankingComplete = (data: any) => {
    setResults(data);
    setTab("new");
    // Refresh sessions list
    fetch(`/api/resume-ranking/sessions/${mandateId}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.data || []))
      .catch(() => {});
  };

  const viewSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/resume-ranking/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setTab("history");
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/mandates/${mandateId}`}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            AI Resume Ranking
          </h1>
          {mandate && (
            <p className="text-sm text-gray-500">
              {mandate.title}
              {mandate.department ? ` · ${mandate.department}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setTab("new"); setResults(null); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "new"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          New Ranking
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "history"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          History ({sessions.length})
        </button>
      </div>

      {/* New Ranking Tab */}
      {tab === "new" && !results && (
        <RankingTrigger
          mandateId={mandateId}
          candidates={candidates}
          onRankingComplete={handleRankingComplete}
        />
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-4">
          {/* Pool Summary */}
          {(results.session?.poolSummary || results.summary) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4" />
                Pool Summary
              </h3>
              <p className="text-sm text-gray-700">
                {results.session?.poolSummary || results.summary}
              </p>
              {results.session?.processingTimeMs && (
                <p className="text-[11px] text-gray-500 mt-2">
                  Analyzed in {(results.session.processingTimeMs / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          )}

          {/* JD Coverage */}
          {results.jdCoverage && (
            <div className="flex gap-3 flex-wrap">
              {[
                {
                  label: "Pool Strength",
                  value: results.jdCoverage.poolStrength,
                  color: results.jdCoverage.poolStrength === "EXCELLENT"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : results.jdCoverage.poolStrength === "GOOD"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200",
                },
                {
                  label: "Strong Fits",
                  value: results.jdCoverage.strongFitCount,
                  color: "bg-gray-50 text-gray-700 border-gray-200",
                },
                {
                  label: "Skill Coverage",
                  value: `${Math.round((results.jdCoverage.avgMustHaveCoverage || 0) * 100)}%`,
                  color: "bg-gray-50 text-gray-700 border-gray-200",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${stat.color}`}
                >
                  {stat.label}: {stat.value}
                </div>
              ))}
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => setResults(null)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> New Ranking
          </button>

          {/* Ranked Cards */}
          <div className="space-y-3">
            {(results.rankings || []).map((r: any, i: number) => (
              <RankedCandidateCard
                key={r.candidateId || i}
                candidate={r}
                defaultExpanded={i === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && !results && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No ranking sessions yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Create your first ranking from the &quot;New Ranking&quot; tab.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => viewSession(s.id)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        s.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : s.status === "PROCESSING"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {s.candidateCount} candidates ranked
                      </span>
                      {s.topCandidate && (
                        <span className="text-xs text-gray-500 ml-2">
                          Top: {s.topCandidate} ({s.topScore ? Math.round(Number(s.topScore)) : '—'}/100)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(s.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {s.poolSummary && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {s.poolSummary}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
