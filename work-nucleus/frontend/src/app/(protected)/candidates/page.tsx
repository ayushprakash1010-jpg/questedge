"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Sparkles,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
  Filter,
  Users,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Application {
  id: string;
  hiringPlanId: string;
  status: string;
  aiMatchScore: string | null;
  aiMatchSummary: string | null;
  appliedAt: string;
  hiringPlan: { id: string; title: string };
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  source: string;
  currentCompany: string | null;
  currentRole: string | null;
  experienceYears: string | null;
  createdAt: string;
  applications: Application[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const sourceColors: Record<string, string> = {
  JOB_BOARD: "bg-blue-50 text-blue-700 border-blue-200",
  REFERRAL: "bg-green-50 text-green-700 border-green-200",
  AGENCY: "bg-purple-50 text-purple-700 border-purple-200",
  DIRECT: "bg-amber-50 text-amber-700 border-amber-200",
  LINKEDIN: "bg-sky-50 text-sky-700 border-sky-200",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  SELECTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
  WITHDRAWN: "bg-slate-50 text-slate-700 border-slate-200",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function getBestScore(applications: Application[]): number | null {
  const scores = applications
    .map((a) => (a.aiMatchScore ? Number(a.aiMatchScore) : null))
    .filter((s): s is number => s !== null);
  return scores.length > 0 ? Math.max(...scores) : null;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [topN, setTopN] = useState<number | null>(null);
  const [hiringPlanId, setHiringPlanId] = useState<string>("");
  const [hiringPlans, setHiringPlans] = useState<
    { id: string; title: string }[]
  >([]);
  const [triggeringScoring, setTriggeringScoring] = useState(false);
  const [scoringMessage, setScoringMessage] = useState("");
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(
    null
  );

  // Fetch hiring plans for filter dropdown
  useEffect(() => {
    fetch("/api/hiring-plans?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setHiringPlans(d.data.map((p: any) => ({ id: p.id, title: p.title })));
      })
      .catch(() => {});
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (hiringPlanId) params.set("hiringPlanId", hiringPlanId);
    if (topN) params.set("topN", String(topN));
    if (!topN) {
      params.set("page", String(page));
      params.set("limit", "20");
    }

    try {
      const res = await fetch(`/api/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.data || []);
        setMeta(data.meta || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, page, topN, hiringPlanId]);

  useEffect(() => {
    const timer = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  const handleTriggerScoring = async () => {
    setTriggeringScoring(true);
    setScoringMessage("");
    try {
      const res = await fetch("/api/candidates/trigger-scoring", {
        method: "POST",
      });
      if (res.ok) {
        setScoringMessage("AI scoring queued! Scores will appear shortly.");
      } else {
        setScoringMessage("Failed to trigger scoring.");
      }
    } catch {
      setScoringMessage("Failed to trigger scoring.");
    } finally {
      setTriggeringScoring(false);
      setTimeout(() => setScoringMessage(""), 5000);
    }
  };

  const handleTopNFilter = (n: number | null) => {
    if (!hiringPlanId && n) {
      // topN requires a hiring plan
      return;
    }
    setTopN(n);
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track candidates and AI resume match scores across hiring plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scoringMessage && (
            <span className="text-sm text-green-700">{scoringMessage}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerScoring}
            disabled={triggeringScoring}
          >
            <Zap className="mr-1.5 h-4 w-4" />
            {triggeringScoring ? "Queuing..." : "Run AI Scoring"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-slate-200">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Hiring Plan Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={hiringPlanId}
                onChange={(e) => {
                  setHiringPlanId(e.target.value);
                  setPage(1);
                  if (!e.target.value) setTopN(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">All Hiring Plans</option>
                {hiringPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Top N Filter — only available when a hiring plan is selected */}
            {hiringPlanId && (
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                {[5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    variant={topN === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTopNFilter(topN === n ? null : n)}
                    className="h-8 px-2.5 text-xs"
                  >
                    Top {n}
                  </Button>
                ))}
                {topN && (
                  <button
                    onClick={() => handleTopNFilter(null)}
                    className="ml-1 rounded p-1 hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {topN && hiringPlanId && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Trophy className="h-4 w-4" />
              Showing top {topN} candidates by AI match score for the selected hiring plan
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : candidates.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center py-16">
            <Users className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No candidates found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "Candidates will appear here once they apply via the public job page."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 text-sm text-slate-500">
            Showing {candidates.length} of {meta?.total ?? 0} candidates
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Candidate
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Experience
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      AI Score
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Applications
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Resume
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Applied
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const bestScore = getBestScore(c.applications);
                  const isExpanded = expandedCandidate === c.id;

                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        className={cn(
                          "cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/50",
                          isExpanded && "bg-slate-50/50"
                        )}
                        onClick={() =>
                          setExpandedCandidate(isExpanded ? null : c.id)
                        }
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                          {c.currentRole && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {c.currentRole}
                              {c.currentCompany && ` at ${c.currentCompany}`}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              sourceColors[c.source] || ""
                            )}
                          >
                            {c.source.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.experienceYears
                            ? `${Number(c.experienceYears)} yrs`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {bestScore !== null ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-semibold",
                                getScoreColor(bestScore)
                              )}
                            >
                              <Sparkles className="mr-1 h-3 w-3" />
                              {bestScore}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.applications.length}
                        </td>
                        <td className="px-4 py-3">
                          {c.resumeUrl ? (
                            <FileText className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.applications[0]
                            ? new Date(
                                c.applications[0].appliedAt
                              ).toLocaleDateString()
                            : new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>

                      {/* Expanded: Show all applications with scores */}
                      {isExpanded && c.applications.length > 0 && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50/30 px-8 py-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Applications ({c.applications.length})
                            </p>
                            <div className="space-y-2">
                              {c.applications.map((app) => (
                                <div
                                  key={app.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <Link
                                      href={`/hiring-plans/${app.hiringPlanId}`}
                                      className="text-sm font-medium text-indigo-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {app.hiringPlan.title}
                                      <ExternalLink className="ml-1 inline h-3 w-3" />
                                    </Link>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        statusColors[app.status] || ""
                                      )}
                                    >
                                      {app.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {app.aiMatchScore ? (
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-xs font-semibold",
                                            getScoreColor(
                                              Number(app.aiMatchScore)
                                            )
                                          )}
                                        >
                                          <Sparkles className="mr-1 h-3 w-3" />
                                          {Number(app.aiMatchScore)}%
                                        </Badge>
                                        {app.aiMatchSummary && (
                                          <span
                                            className="max-w-[300px] truncate text-xs text-slate-500"
                                            title={app.aiMatchSummary}
                                          >
                                            {app.aiMatchSummary}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        Score pending
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-400">
                                      {new Date(
                                        app.appliedAt
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && !topN && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
