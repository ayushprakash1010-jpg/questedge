"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Send } from "lucide-react";

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
        // Assume manager information present in profile or fallback to self
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
    const res = await fetch(`/api/v2/appraisal/assessments/${a.id}/submit`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setA(updated);
    }
  }

  if (!a) return <div className="p-6 text-slate-500">Loading…</div>;

  const isLocked = a.status !== "DRAFT" && a.status !== "REOPENED";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Self-assessment</h1>
        <p className="text-sm text-slate-500">
          Status: <Badge>{a.status}</Badge>{" "}
          {savedAt && <span className="text-xs ml-2">Saved {savedAt.toLocaleTimeString()}</span>}
        </p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Competencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {COMPETENCIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{c.label}</span>
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
                    className={`w-8 h-8 rounded-md border text-sm ${
                      ratings[c.key] === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"
                    }`}
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

      {!isLocked && (
        <Button onClick={submit} disabled={summary.length < 20}>
          <Send className="w-4 h-4 mr-1" /> Submit self-assessment
        </Button>
      )}
      {isLocked && (
        <p className="text-sm text-slate-500">
          Locked. Reach out to HR to reopen if you need to amend.
        </p>
      )}
    </div>
  );
}
