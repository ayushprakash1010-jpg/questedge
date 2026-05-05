"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface Assessment {
  id: string;
  type: string;
  status: string;
  formData: Record<string, unknown>;
  competencyRatings: Record<string, number>;
  selfSummary: string | null;
  managerSummary: string | null;
}

const COMPETENCIES = [
  { key: "ownership", label: "Ownership" },
  { key: "collaboration", label: "Collaboration" },
  { key: "execution", label: "Execution quality" },
  { key: "communication", label: "Communication" },
  { key: "growth_mindset", label: "Growth mindset" },
];

export default function SelfAssessmentPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [a, setA] = useState<Assessment | null>(null);
  const [summary, setSummary] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/v2/profile")
      .then((r) => r.json())
      .then((profile) => {
        const managerId = profile?.managerId ?? profile?.id;
        const employeeId = profile?.id;
        if (!employeeId) return;
        return fetch("/api/v2/appraisal/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cycleId, employeeId, managerId, type: "SELF" }),
        }).then((r) => r.json());
      })
      .then((data) => {
        if (!data) return;
        setA(data);
        setSummary(data.selfSummary ?? "");
        setRatings(data.competencyRatings ?? {});
      });
  }, [cycleId]);

  function autosave(next: { summary?: string; ratings?: Record<string, number> }) {
    if (!a) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/v2/appraisal/assessments/${a.id}/autosave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfSummary: next.summary ?? summary,
          competencyRatings: next.ratings ?? ratings,
        }),
      });
      if (res.ok) setSavedAt(new Date());
    }, 1000);
  }

  async function submit() {
    if (!a) return;
    try {
      const res = await fetch(`/api/v2/appraisal/assessments/${a.id}/submit`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Submit failed");
      const updated = await res.json();
      setA(updated);
      toast.success("Self-assessment submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    }
  }

  if (!a) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const isLocked = a.status !== "DRAFT" && a.status !== "REOPENED";

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Self-assessment
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          Status: <Badge>{a.status}</Badge>
          {savedAt && (
            <span className="text-xs text-slate-400">
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
        </p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Competencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {COMPETENCIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">{c.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    disabled={isLocked}
                    onClick={() => {
                      const next = { ...ratings, [c.key]: v };
                      setRatings(next);
                      autosave({ ratings: next });
                    }}
                    className={cn(
                      "h-8 w-8 rounded-md border text-sm font-medium transition-colors disabled:opacity-50",
                      ratings[c.key] === v
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Reflective summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={8}
            disabled={isLocked}
            placeholder="Highlight key wins, areas of growth, and what you'd like to work on next…"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              autosave({ summary: e.target.value });
            }}
          />
        </CardContent>
      </Card>

      {!isLocked ? (
        <Button onClick={submit} disabled={summary.length < 20}>
          <Send className="h-4 w-4" /> Submit self-assessment
        </Button>
      ) : (
        <p className="text-sm text-slate-500">
          Locked. Reach out to HR to reopen if you need to amend.
        </p>
      )}
    </div>
  );
}
