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
  LayoutGrid,
  List,
  GripVertical,
  Clock,
  ArrowRight,
  Loader2,
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
  candidateProfileId?: string;
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

function getBestScore(applications?: Application[]): number | null {
  if (!applications) return null;
  const scores = applications
    .map((a) => (a.aiMatchScore != null ? Number(a.aiMatchScore) : null))
    .filter((s): s is number => s !== null && !isNaN(s) && s > 0);
  return scores.length > 0 ? Math.max(...scores) : null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Detect possible duplicate candidates based on normalized name
function buildDuplicateNameSet(candidates: Candidate[]): Set<string> {
  const normalizedNames = candidates.map((c) =>
    c.name.trim().toLowerCase().replace(/\s+/g, " ")
  );
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const n of normalizedNames) {
    if (seen.has(n)) duplicates.add(n);
    else seen.add(n);
  }
  return duplicates;
}

interface HiringPlanLite {
  id: string;
  title: string;
}

type KanbanColumnKey = "ACTIVE" | "ON_HOLD" | "SELECTED" | "REJECTED";

const KANBAN_COLUMNS: {
  id: KanbanColumnKey;
  title: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
}[] = [
  {
    id: "ACTIVE",
    title: "Applied / Active",
    badgeClass: "bg-blue-100 text-blue-800",
    borderClass: "border-blue-200",
    bgClass: "bg-blue-50/30",
  },
  {
    id: "ON_HOLD",
    title: "On Hold",
    badgeClass: "bg-amber-100 text-amber-800",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50/30",
  },
  {
    id: "SELECTED",
    title: "Selected / Offer",
    badgeClass: "bg-emerald-100 text-emerald-800",
    borderClass: "border-emerald-200",
    bgClass: "bg-emerald-50/30",
  },
  {
    id: "REJECTED",
    title: "Rejected",
    badgeClass: "bg-rose-100 text-rose-800",
    borderClass: "border-rose-200",
    bgClass: "bg-rose-50/30",
  },
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [openingResumeId, setOpeningResumeId] = useState<string | null>(null);

  const handleViewResume = async (candidateId: string) => {
    try {
      setOpeningResumeId(candidateId);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/v1/candidate/profile/${candidateId}/resume`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to load resume");
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to view resume", err);
      alert("Failed to open resume");
    } finally {
      setOpeningResumeId(null);
    }
  };
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [topN, setTopN] = useState<number | null>(null);
  const [hiringPlanId, setHiringPlanId] = useState<string>("");
  const [hiringPlans, setHiringPlans] = useState<HiringPlanLite[]>([]);
  const [triggeringScoring, setTriggeringScoring] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  // Kanban & View Mode State
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [draggedItem, setDraggedItem] = useState<{
    candidateId: string;
    applicationId: string;
    fromStatus: string;
  } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDragStart = (
    e: React.DragEvent,
    candidateId: string,
    applicationId: string,
    fromStatus: string
  ) => {
    setDraggedItem({ candidateId, applicationId, fromStatus });
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ candidateId, applicationId, fromStatus })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: KanbanColumnKey) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedItem || draggedItem.fromStatus === targetStatus) return;

    const { candidateId, applicationId } = draggedItem;
    const prevCandidates = [...candidates];

    // Optimistic local update
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          return {
            ...c,
            applications: c.applications.map((a) =>
              a.id === applicationId ? { ...a, status: targetStatus } : a
            ),
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status on server");
      toast.success(`Moved candidate to ${targetStatus.replace("_", " ")}`);
    } catch {
      setCandidates(prevCandidates);
      toast.error("Failed to update candidate status");
    } finally {
      setDraggedItem(null);
    }
  };

  // Derived: set of normalized names that appear more than once in the current page
  const duplicateNameSet = buildDuplicateNameSet(candidates);

  // Fetch hiring plans & mandates for filter dropdown
  useEffect(() => {
    Promise.all([
      fetch("/api/hiring-plans?limit=100")
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      fetch("/api/mandates?limit=100")
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ]).then(([plansData, mandatesData]: [any, any]) => {
      const items: HiringPlanLite[] = [];
      const seenIds = new Set<string>();

      const addItems = (list?: any[]) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
          if (item?.id && item?.title && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            items.push({ id: item.id, title: item.title });
          }
        }
      };

      addItems(plansData.data);
      addItems(mandatesData.data);
      setHiringPlans(items);
    });
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
        setCandidates(
          (data.data || []).map((c: any) => ({
            ...c,
            applications: c.applications || [],
          }))
        );
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
        subtitle="Track candidates, pipeline stages, and AI resume match scores."
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                  viewMode === "kanban"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerScoring}
              disabled={triggeringScoring}
            >
              <Zap className="h-4 w-4" />
              {triggeringScoring ? "Queuing..." : "Run AI Scoring"}
            </Button>
          </div>
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
                <option value="">All Positions & Plans</option>
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
              : "Candidates will appear here once they are referred by recruiters or apply directly."
          }
        />
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colCandidates = candidates.filter((c) => {
              const mainApp = c.applications[0];
              const status = mainApp?.status || "ACTIVE";
              return status === col.id;
            });
            const isOver = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  "flex flex-col rounded-xl border p-3.5 transition-all min-h-[460px]",
                  col.borderClass,
                  col.bgClass,
                  isOver && "ring-2 ring-indigo-500 ring-offset-2 border-indigo-400 bg-indigo-50/50"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{col.title}</span>
                    <Badge className={cn("text-xs font-bold px-2 py-0.5", col.badgeClass)}>
                      {colCandidates.length}
                    </Badge>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1">
                  {colCandidates.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-center p-3 text-xs text-slate-400">
                      Drag candidates here
                    </div>
                  ) : (
                    colCandidates.map((c) => {
                      const mainApp = c.applications[0];
                      const score = getBestScore(c.applications);
                      const isDragging = draggedItem?.candidateId === c.id;

                      return (
                        <div
                          key={c.id}
                          draggable={!!mainApp?.id}
                          onDragStart={(e) =>
                            mainApp &&
                            handleDragStart(e, c.id, mainApp.id, mainApp.status || "ACTIVE")
                          }
                          className={cn(
                            "group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
                            isDragging && "opacity-40 scale-95 border-indigo-300"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {c.name}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">{c.email}</p>
                            </div>
                            <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-400 shrink-0" />
                          </div>

                          {(c.currentRole || c.currentCompany) && (
                            <p className="text-xs text-slate-600 mb-2 truncate">
                              {[c.currentRole, c.currentCompany].filter(Boolean).join(" @ ")}
                            </p>
                          )}

                          {/* Plan / Mandate Title */}
                          {mainApp?.hiringPlan?.title && (
                            <div className="mb-2.5">
                              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 max-w-full truncate">
                                📋 {mainApp.hiringPlan.title}
                              </span>
                            </div>
                          )}

                          {/* Footer with Score & Details link */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            {score !== null ? (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-semibold gap-1", scoreBadgeClass(score))}
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                {score}% Match
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400">Unscored</span>
                            )}

                            {mainApp?.id ? (
                              <Link
                                href={`/candidates/${c.id}/joining`}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                              >
                                View
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {c.experienceYears ? `${c.experienceYears}y exp` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-900">{c.name}</p>
                          {duplicateNameSet.has(c.name.trim().toLowerCase().replace(/\s+/g, " ")) && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Duplicate
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{c.email}</p>
                        {c.currentRole && (
                          <p className="text-xs text-slate-400">
                            {c.currentRole}
                            {c.currentCompany && ` at ${c.currentCompany}`}
                          </p>
                        )}
                      </div>
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
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          Unscored
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell>{c.applications.length}</DataTableCell>
                    <DataTableCell>
                      {c.resumeUrl ? (
                        <button
                          type="button"
                          onClick={() => handleViewResume(c.candidateProfileId || c.id)}
                          disabled={openingResumeId === (c.candidateProfileId || c.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                          title="Open candidate resume in new tab"
                        >
                          {openingResumeId === (c.candidateProfileId || c.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          )}
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-slate-500 text-xs">
                      {c.applications[0]
                        ? formatDate(c.applications[0].appliedAt)
                        : formatDate(c.createdAt)}
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
                                  href={`/mandates/${app.hiringPlanId}`}
                                  className="text-sm font-medium text-indigo-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {app.hiringPlan?.title || "View Position"}
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
                                {app.aiMatchScore && Number(app.aiMatchScore) > 0 ? (
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
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                    Unscored
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
