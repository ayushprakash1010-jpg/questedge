"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  FileText,
  ExternalLink,
  Zap,
  Filter,
  Users,
  Trophy,
  X,
} from "lucide-react";
import { Badge, CandidateStatusBadge, type CandidateStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

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

const PAGE_SIZE = 20;

const sourceColors: Record<string, string> = {
  JOB_BOARD: "bg-blue-50 text-blue-700 border-blue-200",
  REFERRAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  AGENCY: "bg-purple-50 text-purple-700 border-purple-200",
  DIRECT: "bg-amber-50 text-amber-700 border-amber-200",
  LINKEDIN: "bg-sky-50 text-sky-700 border-sky-200",
};

const VALID_CANDIDATE_STATUSES: CandidateStatus[] = [
  "ACTIVE",
  "SELECTED",
  "REJECTED",
  "ON_HOLD",
  "WITHDRAWN",
];
const VALID_STATUS_SET = new Set<string>(VALID_CANDIDATE_STATUSES);

// 4-tier score scheme specific to this page (AI resume match shown with finer
// granularity than the kanban 3-tier helper).
function scoreBadgeClass(score: number): string {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
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

interface HiringPlanLite {
  id: string;
  title: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [topN, setTopN] = useState<number | null>(null);
  const [hiringPlanId, setHiringPlanId] = useState<string>("");
  const [hiringPlans, setHiringPlans] = useState<HiringPlanLite[]>([]);
  const [triggeringScoring, setTriggeringScoring] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  // Fetch hiring plans for filter dropdown
  useEffect(() => {
    fetch("/api/hiring-plans?limit=100")
      .then((r) => r.json())
      .then((d: { data?: HiringPlanLite[] }) => {
        if (d.data) setHiringPlans(d.data.map((p) => ({ id: p.id, title: p.title })));
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
      params.set("limit", String(PAGE_SIZE));
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
    try {
      const res = await fetch("/api/candidates/trigger-scoring", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("AI scoring queued — scores will appear shortly.");
      } else {
        toast.error("Failed to trigger scoring.");
      }
    } catch {
      toast.error("Failed to trigger scoring.");
    } finally {
      setTriggeringScoring(false);
    }
  };

  const handleTopNFilter = (n: number | null) => {
    if (!hiringPlanId && n) return; // topN requires a hiring plan
    setTopN(n);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle="Track candidates and AI resume match scores across hiring plans."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerScoring}
            disabled={triggeringScoring}
          >
            <Zap className="h-4 w-4" />
            {triggeringScoring ? "Queuing..." : "Run AI Scoring"}
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1">
              <Input
                leftIcon={<Search />}
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select
                value={hiringPlanId}
                onChange={(e) => {
                  setHiringPlanId(e.target.value);
                  setPage(1);
                  if (!e.target.value) setTopN(null);
                }}
                className="w-56"
              >
                <option value="">All Hiring Plans</option>
                {hiringPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>

            {hiringPlanId && (
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                {[5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    variant={topN === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTopNFilter(topN === n ? null : n)}
                  >
                    Top {n}
                  </Button>
                ))}
                {topN && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleTopNFilter(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {topN && hiringPlanId && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Trophy className="h-4 w-4" />
              Showing top {topN} candidates by AI match score for the selected hiring plan
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-16 w-full" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No candidates found"
          description={
            search
              ? "Try a different search term."
              : "Candidates will appear here once they apply via the public job page."
          }
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Candidate</DataTableHead>
              <DataTableHead>Source</DataTableHead>
              <DataTableHead>Experience</DataTableHead>
              <DataTableHead>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  AI Score
                </span>
              </DataTableHead>
              <DataTableHead>Applications</DataTableHead>
              <DataTableHead>Resume</DataTableHead>
              <DataTableHead>Applied</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {candidates.map((c) => {
              const bestScore = getBestScore(c.applications);
              const isExpanded = expandedCandidate === c.id;

              return (
                <React.Fragment key={c.id}>
                  <DataTableRow
                    selected={isExpanded}
                    onClick={() =>
                      setExpandedCandidate(isExpanded ? null : c.id)
                    }
                  >
                    <DataTableCell>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                      {c.currentRole && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {c.currentRole}
                          {c.currentCompany && ` at ${c.currentCompany}`}
                        </p>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", sourceColors[c.source] ?? "")}
                      >
                        {c.source.replace("_", " ")}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      {c.experienceYears
                        ? `${Number(c.experienceYears)} yrs`
                        : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      {bestScore !== null ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold",
                            scoreBadgeClass(bestScore)
                          )}
                        >
                          <Sparkles className="h-3 w-3" />
                          {bestScore}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>{c.applications.length}</DataTableCell>
                    <DataTableCell>
                      {c.resumeUrl ? (
                        <FileText className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-slate-500">
                      {c.applications[0]
                        ? new Date(c.applications[0].appliedAt).toLocaleDateString()
                        : new Date(c.createdAt).toLocaleDateString()}
                    </DataTableCell>
                  </DataTableRow>

                  {/* Expanded: show all applications with scores */}
                  {isExpanded && c.applications.length > 0 && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50/40 px-8 py-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                                {VALID_STATUS_SET.has(app.status) ? (
                                  <CandidateStatusBadge
                                    status={app.status as CandidateStatus}
                                  />
                                ) : (
                                  <Badge variant="outline">{app.status}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                {app.aiMatchScore ? (
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs font-semibold",
                                        scoreBadgeClass(Number(app.aiMatchScore))
                                      )}
                                    >
                                      <Sparkles className="h-3 w-3" />
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
                                  {new Date(app.appliedAt).toLocaleDateString()}
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
          </DataTableBody>
          {meta && !topN && meta.total > PAGE_SIZE && (
            <tfoot>
              <tr>
                <td colSpan={7} className="p-0">
                  <DataTablePagination
                    page={meta.page}
                    pageSize={PAGE_SIZE}
                    total={meta.total}
                    onPageChange={(p) => setPage(p)}
                  />
                </td>
              </tr>
            </tfoot>
          )}
        </DataTable>
      )}
    </div>
  );
}
