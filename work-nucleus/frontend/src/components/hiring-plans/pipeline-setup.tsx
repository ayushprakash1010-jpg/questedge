"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GripVertical, Plus, Pencil, Trash2, Zap, Users, X,
} from "lucide-react";

interface Stage {
  id: string;
  name: string;
  stageType: string;
  stageOrder: number;
  maxDurationDays: number | null;
  description: string | null;
  skillsToEvaluate: string[];
  interviewers: { id: string; user: { id: string; name: string; email: string }; isMandatory: boolean }[];
  _count?: { applications: number };
}

const stageTypeColors: Record<string, string> = {
  SCREENING: "bg-blue-50 text-blue-700 border-blue-200",
  TECHNICAL: "bg-purple-50 text-purple-700 border-purple-200",
  HR: "bg-green-50 text-green-700 border-green-200",
  LEADERSHIP: "bg-amber-50 text-amber-700 border-amber-200",
  CULTURAL: "bg-cyan-50 text-cyan-700 border-cyan-200",
  OFFER: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CUSTOM: "bg-slate-50 text-slate-700 border-slate-200",
};

const STAGE_TYPES = ["SCREENING", "TECHNICAL", "HR", "LEADERSHIP", "CULTURAL", "OFFER", "CUSTOM"];

export function PipelineSetup({ planId }: { planId: string }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("SCREENING");
  const [formMaxDays, setFormMaxDays] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/stages`);
      if (res.ok) {
        const data = await res.json();
        setStages(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const openAddDialog = () => {
    setEditingStage(null);
    setFormName("");
    setFormType("SCREENING");
    setFormMaxDays("");
    setFormDescription("");
    setShowDialog(true);
  };

  const openEditDialog = (stage: Stage) => {
    setEditingStage(stage);
    setFormName(stage.name);
    setFormType(stage.stageType);
    setFormMaxDays(stage.maxDurationDays?.toString() || "");
    setFormDescription(stage.description || "");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      if (editingStage) {
        // Update
        await fetch(`/api/hiring-plans/${planId}/stages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: editingStage.id,
            name: formName,
            stageType: formType,
            maxDurationDays: formMaxDays ? parseInt(formMaxDays) : null,
            description: formDescription || null,
          }),
        });
      } else {
        // Create
        await fetch(`/api/hiring-plans/${planId}/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            stageType: formType,
            maxDurationDays: formMaxDays ? parseInt(formMaxDays) : null,
            description: formDescription || null,
          }),
        });
      }
      setShowDialog(false);
      fetchStages();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stageId: string) => {
    if (!confirm("Delete this stage?")) return;
    try {
      await fetch(`/api/hiring-plans/${planId}/stages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      fetchStages();
    } catch {
      // ignore
    }
  };

  const handleDefaultTemplate = async () => {
    if (stages.length > 0 && !confirm("This will only work if there are no existing stages. Continue?")) return;
    try {
      await fetch(`/api/hiring-plans/${planId}/stages?action=default-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchStages();
    } catch {
      // ignore
    }
  };

  // Simple drag reorder via HTML5 drag
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newStages = [...stages];
    const [moved] = newStages.splice(draggedIdx, 1);
    newStages.splice(idx, 0, moved);
    setStages(newStages);
    setDraggedIdx(idx);
  };
  const handleDragEnd = async () => {
    setDraggedIdx(null);
    // Save new order
    try {
      await fetch(`/api/hiring-plans/${planId}/stages?action=reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageIds: stages.map((s) => s.id) }),
      });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Pipeline Stages ({stages.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDefaultTemplate}>
            <Zap className="mr-1 h-3 w-3" />
            Use Default Template
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-1 h-3 w-3" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* Stages list */}
      {stages.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-sm text-slate-500">No stages configured yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Add stages manually or use the default template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors",
                draggedIdx === idx && "border-indigo-300 bg-indigo-50/50"
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
              <span className="w-6 text-center text-xs font-medium text-slate-400">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">
                {stage.name}
              </span>
              <Badge
                variant="outline"
                className={cn("text-xs", stageTypeColors[stage.stageType])}
              >
                {stage.stageType}
              </Badge>
              {stage.maxDurationDays && (
                <span className="text-xs text-slate-400">
                  {stage.maxDurationDays}d
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                {stage.interviewers?.length || 0}
              </span>
              <button
                onClick={() => openEditDialog(stage)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(stage.id)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingStage ? "Edit Stage" : "Add Stage"}
              </h3>
              <button onClick={() => setShowDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <Label>Stage Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Technical Round 1" />
              </div>
              <div>
                <Label>Stage Type</Label>
                <Select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  {STAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Max Duration (days)</Label>
                <Input
                  type="number"
                  value={formMaxDays}
                  onChange={(e) => setFormMaxDays(e.target.value)}
                  placeholder="Optional"
                  min={1}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? "Saving..." : editingStage ? "Update" : "Add Stage"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
