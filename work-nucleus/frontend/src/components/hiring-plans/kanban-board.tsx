"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Users, X, Search, UserPlus, Sparkles, Award, FileText, MessageSquare, Settings, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CandidateCard,
  slaBadgeClass,
} from "@/components/shared/candidate-card";
import { cn } from "@/lib/utils";

interface KanbanCandidate {
  applicationId: string;
  candidateId: string;
  name: string;
  email: string;
  currentRole: string | null;
  currentCompany: string | null;
  experienceYears: number | null;
  totalScore: number | null;
  aiMatchScore: number | null;
  daysInStage: number;
  stageEnteredAt: string;
}

interface KanbanStage {
  id: string;
  name: string;
  stageType: string;
  stageOrder: number;
  maxDurationDays: number | null;
  candidateCount: number;
  avgDaysInStage: number;
  candidates: KanbanCandidate[];
}

interface PipelineStats {
  totalCandidates: number;
  activeCandidates: number;
  selected: number;
  rejected: number;
  rejectionRate: number;
}

const stageTypeIcon: Record<string, LucideIcon> = {
  SCREENING: Search,
  TECHNICAL: Sparkles,
  HR: MessageSquare,
  LEADERSHIP: Award,
  CULTURAL: Users,
  OFFER: FileText,
  CUSTOM: Settings,
};

function buildRoleLabel(c: KanbanCandidate): string | undefined {
  const parts = [c.currentRole, c.currentCompany].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(" @ ");
}

export function KanbanBoard({
  planId,
  onCandidateClick,
}: {
  planId: string;
  onCandidateClick: (applicationId: string) => void;
}) {
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [draggedApp, setDraggedApp] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const [boardRes, statsRes] = await Promise.all([
        fetch(`/api/hiring-plans/${planId}/pipeline`),
        fetch(`/api/hiring-plans/${planId}/pipeline?stats=true`),
      ]);
      if (boardRes.ok) {
        const data = await boardRes.json();
        setStages(Array.isArray(data) ? data : []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
    setDraggedApp(applicationId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedApp) return;

    // Optimistic update
    setStages((prev) => {
      const newStages = prev.map((s) => ({
        ...s,
        candidates: s.candidates.filter((c) => c.applicationId !== draggedApp),
      }));
      const candidate = prev
        .flatMap((s) => s.candidates)
        .find((c) => c.applicationId === draggedApp);
      if (candidate) {
        const targetIdx = newStages.findIndex((s) => s.id === targetStageId);
        if (targetIdx !== -1) {
          newStages[targetIdx].candidates.push({ ...candidate, daysInStage: 0 });
          newStages[targetIdx].candidateCount =
            newStages[targetIdx].candidates.length;
        }
      }
      return newStages.map((s) => ({ ...s, candidateCount: s.candidates.length }));
    });

    setDraggedApp(null);

    try {
      await fetch(`/api/applications/${draggedApp}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStageId }),
      });
    } catch {
      fetchBoard(); // Revert on failure
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="No Pipeline Stages"
        description="Go to the Setup tab to configure your interview pipeline stages first."
      />
    );
  }

  // Filter candidates by search
  const filteredStages = stages.map((stage) => ({
    ...stage,
    candidates: searchFilter
      ? stage.candidates.filter(
          (c) =>
            c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            c.email.toLowerCase().includes(searchFilter.toLowerCase())
        )
      : stage.candidates,
  }));

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      {stats && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200/70 bg-white px-5 py-3 shadow-sm">
          <Stat label="Total" value={stats.totalCandidates} dotClass="bg-slate-400" />
          <Stat label="Active" value={stats.activeCandidates} dotClass="bg-blue-500" />
          <Stat label="Selected" value={stats.selected} dotClass="bg-emerald-500" />
          <Stat label="Rejected" value={stats.rejected} dotClass="bg-red-500" />
          <Stat label="Rejection Rate" value={`${stats.rejectionRate}%`} dotClass="bg-amber-500" />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Input
          leftIcon={<Search />}
          className="w-60"
          placeholder="Search candidates..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          Add Candidate
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {filteredStages.map((stage) => {
          const Icon = stageTypeIcon[stage.stageType] ?? Settings;
          const slaCls = stage.maxDurationDays
            ? slaBadgeClass(stage.avgDaysInStage, stage.maxDurationDays)
            : "text-slate-500";

          return (
            <div
              key={stage.id}
              className="flex w-[268px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                    <Icon className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {stage.name}
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {stage.candidateCount}
                </span>
              </div>

              {/* SLA meta row */}
              {(stage.avgDaysInStage > 0 || stage.maxDurationDays) && (
                <div className="border-b border-slate-100 bg-white px-3.5 py-1.5">
                  <span
                    className={cn(
                      "rounded px-1 text-[10px] font-medium",
                      slaCls
                    )}
                  >
                    Avg {stage.avgDaysInStage}d
                    {stage.maxDurationDays
                      ? ` · SLA ${stage.maxDurationDays}d`
                      : ""}
                  </span>
                </div>
              )}

              {/* Cards */}
              <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2">
                {stage.candidates.map((c) => (
                  <CandidateCard
                    key={c.applicationId}
                    name={c.name}
                    role={buildRoleLabel(c)}
                    score={c.totalScore ?? c.aiMatchScore ?? undefined}
                    daysInStage={c.daysInStage}
                    slaMaxDays={stage.maxDurationDays ?? 0}
                    yearsExperience={c.experienceYears ?? undefined}
                    isDragging={draggedApp === c.applicationId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.applicationId)}
                    onClick={() => onCandidateClick(c.applicationId)}
                  />
                ))}
                {stage.candidates.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No candidates
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddDialog && (
        <AddCandidateDialog
          planId={planId}
          onClose={() => setShowAddDialog(false)}
          onAdded={() => {
            setShowAddDialog(false);
            fetchBoard();
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number | string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span className="font-bold text-slate-900">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

interface SearchedCandidate {
  id: string;
  name: string;
  email: string;
}

function AddCandidateDialog({
  planId,
  onClose,
  onAdded,
}: {
  planId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<"search" | "create">("create");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedCandidate[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", source: "DIRECT",
    currentCompany: "", currentRole: "", experienceYears: "",
    expectedCtc: "", noticePeriodDays: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    const res = await fetch(`/api/candidates?q=${encodeURIComponent(searchQ)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.data || []);
    }
  };

  const addExistingCandidate = async (candidateId: string) => {
    setSaving(true);
    try {
      await fetch(`/api/hiring-plans/${planId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      onAdded();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      const createRes = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          experienceYears: form.experienceYears ? parseFloat(form.experienceYears) : undefined,
          expectedCtc: form.expectedCtc ? parseFloat(form.expectedCtc) : undefined,
          noticePeriodDays: form.noticePeriodDays ? parseInt(form.noticePeriodDays) : undefined,
        }),
      });
      if (!createRes.ok) return;
      const candidate = await createRes.json();

      await fetch(`/api/hiring-plans/${planId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      onAdded();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Add Candidate</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant={mode === "create" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("create")}
          >
            Create New
          </Button>
          <Button
            variant={mode === "search" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("search")}
          >
            Search Existing
          </Button>
        </div>

        {mode === "search" ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addExistingCandidate(c.id)}
                    disabled={saving}
                  >
                    Add
                  </Button>
                </div>
              ))}
              {searchResults.length === 0 && searchQ && (
                <p className="py-4 text-center text-sm text-slate-400">No results</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Source</Label>
                <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="DIRECT">Direct</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="JOB_BOARD">Job Board</option>
                  <option value="AGENCY">Agency</option>
                  <option value="INTERNAL">Internal</option>
                </Select>
              </div>
              <div>
                <Label>Current Company</Label>
                <Input value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} />
              </div>
              <div>
                <Label>Current Role</Label>
                <Input value={form.currentRole} onChange={(e) => setForm({ ...form, currentRole: e.target.value })} />
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input type="number" step="0.5" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
              </div>
              <div>
                <Label>Expected CTC</Label>
                <Input type="number" value={form.expectedCtc} onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })} />
              </div>
              <div>
                <Label>Notice Period (days)</Label>
                <Input type="number" value={form.noticePeriodDays} onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateAndAdd} disabled={saving || !form.name || !form.email}>
                {saving ? "Adding..." : "Create & Add to Pipeline"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
