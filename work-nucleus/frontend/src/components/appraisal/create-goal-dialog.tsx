"use client";

import { useEffect, useState } from "react";
import { Loader2, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { readResponseError } from "@/lib/api";

export interface GoalCycleOption {
  id: string;
  name: string;
  status?: string;
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CreateGoalDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  cycles: GoalCycleOption[];
  defaultCycleId?: string;
  currentUserId?: string;
  currentUserRole?: string;
}

const GOAL_TYPES = [
  { value: "OKR", label: "OKR (Objective & Key Results)" },
  { value: "KRA", label: "KRA (Key Result Area)" },
  { value: "COMPETENCY", label: "Competency" },
  { value: "VALUE", label: "Core Value" },
  { value: "STRETCH", label: "Stretch Goal" },
] as const;

export function CreateGoalDialog({
  open,
  onClose,
  onCreated,
  cycles,
  defaultCycleId,
  currentUserId,
  currentUserRole,
}: CreateGoalDialogProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssignOther =
    currentUserRole === "ADMIN" ||
    currentUserRole === "HR" ||
    currentUserRole === "HIRING_MANAGER";

  const [cycleId, setCycleId] = useState(defaultCycleId || cycles[0]?.id || "");
  const [employeeId, setEmployeeId] = useState(currentUserId || "");
  const [managerId, setManagerId] = useState("");
  const [type, setType] = useState<string>("OKR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState("");
  const [weight, setWeight] = useState("25");

  useEffect(() => {
    if (!open) return;
    setCycleId(defaultCycleId || cycles[0]?.id || "");
    if (currentUserId) {
      setEmployeeId((prev) => prev || currentUserId);
    }
    setError(null);
    setLoadingMembers(true);

    fetch("/api/v2/appraisal/goals/team-members")
      .then(async (r) => {
        if (!r.ok) throw new Error(await readResponseError(r, "Failed to load team members"));
        return r.json();
      })
      .then((list) => {
        const arr: OrgMember[] = Array.isArray(list) ? list : [];
        setMembers(arr);
        const fallbackUserId = currentUserId || arr[0]?.id || "";
        setEmployeeId((prev) => prev || fallbackUserId);
        const defaultMgr =
          arr.find(
            (m) =>
              m.id !== fallbackUserId &&
              (m.role === "ADMIN" || m.role === "HR" || m.role === "HIRING_MANAGER"),
          )?.id ||
          arr.find((m) => m.id !== fallbackUserId)?.id ||
          "";
        setManagerId((prev) => (prev && prev !== fallbackUserId ? prev : defaultMgr));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load team directory");
      })
      .finally(() => setLoadingMembers(false));
  }, [open, defaultCycleId, cycles, currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmployeeId = canAssignOther ? employeeId : currentUserId || employeeId;
    if (!managerId) {
      setError("Please select a reporting manager or reviewer.");
      return;
    }
    if (effectiveEmployeeId && managerId === effectiveEmployeeId) {
      setError("Employee and reviewer/manager cannot be the same person.");
      return;
    }
    const numericWeight = parseInt(weight, 10);
    if (Number.isNaN(numericWeight) || numericWeight < 0 || numericWeight > 100) {
      setError("Weight must be an integer between 0 and 100.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/appraisal/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          employeeId: effectiveEmployeeId,
          managerId,
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          metrics: metrics.trim() || undefined,
          weight: numericWeight,
        }),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to create goal"));
      }
      toast.success("Goal created");
      setTitle("");
      setDescription("");
      setMetrics("");
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create goal";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add Appraisal Goal</h2>
              <p className="text-xs text-slate-500">Weights per employee in a cycle cannot exceed 100%</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close goal modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle *</label>
              <Select value={cycleId} onChange={(e) => setCycleId(e.target.value)} disabled={cycles.length <= 1}>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Type *</label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {GOAL_TYPES.map((gt) => (
                  <option key={gt.value} value={gt.value}>
                    {gt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
              <Select
                value={canAssignOther ? employeeId : currentUserId || employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={loadingMembers || !canAssignOther}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer / Manager *</label>
              <Select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                disabled={loadingMembers}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Title *</label>
              <Input
                required
                minLength={2}
                placeholder="e.g. Ship v2 latency optimizations under 150ms"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (%) *</label>
              <Input
                type="number"
                min={0}
                max={100}
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Success Metrics</label>
            <Input
              placeholder="e.g. p95 < 150ms across top 5 API routes"
              value={metrics}
              onChange={(e) => setMetrics(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <Textarea
              rows={3}
              placeholder="Context, deliverables, and key milestones..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !cycleId || !employeeId || !managerId || title.trim().length < 2}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Goal"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
