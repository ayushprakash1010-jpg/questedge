"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus, Users, Clock, Award, X, Search, UserPlus, Sparkles,
} from "lucide-react";

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

const stageTypeIcons: Record<string, string> = {
  SCREENING: "🔍",
  TECHNICAL: "💻",
  HR: "🤝",
  LEADERSHIP: "👔",
  CULTURAL: "🌐",
  OFFER: "📋",
  CUSTOM: "⚙️",
};

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
      const candidate = prev.flatMap((s) => s.candidates).find((c) => c.applicationId === draggedApp);
      if (candidate) {
        const targetIdx = newStages.findIndex((s) => s.id === targetStageId);
        if (targetIdx !== -1) {
          newStages[targetIdx].candidates.push({ ...candidate, daysInStage: 0 });
          newStages[targetIdx].candidateCount = newStages[targetIdx].candidates.length;
        }
      }
      return newStages.map((s) => ({ ...s, candidateCount: s.candidates.length }));
    });

    setDraggedApp(null);

    // API call
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

  const getDaysColor = (days: number, maxDays: number | null) => {
    if (!maxDays) return "text-slate-500";
    const ratio = days / maxDays;
    if (ratio > 1) return "text-red-600 bg-red-50";
    if (ratio > 0.5) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "";
    if (score > 75) return "text-green-600 bg-green-50";
    if (score > 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No Pipeline Stages</h3>
        <p className="mt-1 text-sm text-slate-500">
          Go to the Setup tab to configure your interview pipeline stages first.
        </p>
      </div>
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
      {/* Stats bar */}
      {stats && (
        <div className="flex gap-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <StatItem label="Total" value={stats.totalCandidates} />
          <StatItem label="Active" value={stats.activeCandidates} color="text-blue-600" />
          <StatItem label="Selected" value={stats.selected} color="text-green-600" />
          <StatItem label="Rejected" value={stats.rejected} color="text-red-600" />
          <StatItem label="Rejection Rate" value={`${stats.rejectionRate}%`} />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 w-60"
              placeholder="Search candidates..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-1 h-3 w-3" />
          Add Candidate
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filteredStages.map((stage) => (
          <div
            key={stage.id}
            className="w-72 shrink-0 rounded-lg border border-slate-200 bg-slate-50"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Column header */}
            <div className="border-b border-slate-200 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{stageTypeIcons[stage.stageType] || "⚙️"}</span>
                  <h4 className="text-sm font-semibold text-slate-900">{stage.name}</h4>
                </div>
                <Badge variant="outline" className="text-xs">
                  {stage.candidateCount}
                </Badge>
              </div>
              {stage.avgDaysInStage > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span
                    className={cn(
                      "rounded px-1 text-xs",
                      stage.maxDurationDays && stage.avgDaysInStage > stage.maxDurationDays
                        ? "text-amber-600"
                        : "text-slate-500"
                    )}
                  >
                    Avg {stage.avgDaysInStage}d
                  </span>
                </div>
              )}
            </div>

            {/* Candidate cards */}
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-2">
              {stage.candidates.map((candidate) => (
                <div
                  key={candidate.applicationId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate.applicationId)}
                  onClick={() => onCandidateClick(candidate.applicationId)}
                  className={cn(
                    "cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow",
                    draggedApp === candidate.applicationId && "opacity-50"
                  )}
                >
                  <p className="text-sm font-medium text-slate-900">{candidate.name}</p>
                  {(candidate.currentRole || candidate.currentCompany) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {candidate.currentRole}
                      {candidate.currentRole && candidate.currentCompany ? " @ " : ""}
                      {candidate.currentCompany}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {candidate.experienceYears !== null && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {candidate.experienceYears}y exp
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs",
                        getDaysColor(candidate.daysInStage, stage.maxDurationDays)
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {candidate.daysInStage}d
                    </span>
                    {candidate.aiMatchScore !== null && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs",
                          getScoreColor(candidate.aiMatchScore)
                        )}
                        title="AI Resume Match Score"
                      >
                        <Sparkles className="h-3 w-3" />
                        {candidate.aiMatchScore}
                      </span>
                    )}
                    {candidate.totalScore !== null && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs",
                          getScoreColor(candidate.totalScore)
                        )}
                      >
                        <Award className="h-3 w-3" />
                        {candidate.totalScore}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {stage.candidates.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400">No candidates</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Candidate Dialog */}
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

function StatItem({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-sm font-semibold", color || "text-slate-900")}>{value}</p>
    </div>
  );
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
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
      // Create candidate
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

      // Add to pipeline
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
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
