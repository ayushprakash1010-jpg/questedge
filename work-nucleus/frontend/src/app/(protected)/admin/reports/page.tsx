"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, Play } from "lucide-react";

interface ReportDef {
  id: string;
  name: string;
  description: string | null;
  dataSource: string;
  visualization: string;
  lastRunAt: string | null;
}

const SOURCES = ["HIRING", "APPLICATIONS", "APPRAISAL", "COMPENSATION", "BGV", "ATTRITION"];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [draft, setDraft] = useState<{ name: string; description: string; dataSource: string }>({
    name: "",
    description: "",
    dataSource: "HIRING",
  });
  const [prompt, setPrompt] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/v2/reports");
    if (res.ok) setReports(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function createReport() {
    if (!draft.name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v2/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) alert("Save failed");
      await load();
      setDraft({ name: "", description: "", dataSource: "HIRING" });
    } finally {
      setBusy(false);
    }
  }

  async function aiDraft() {
    if (prompt.trim().length < 5) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v2/reports/natural-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) setAiResult(await res.json());
    } finally {
      setBusy(false);
    }
  }

  async function runReport(id: string) {
    const res = await fetch(`/api/v2/reports/${id}/run`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      window.alert(`Rows: ${data.rows.length}\n\n${JSON.stringify(data.rows.slice(0, 3), null, 2)}`);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-slate-500">
          Build saved reports across hiring, appraisals, compensation, BGV, and attrition.
        </p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Describe a report (AI draft)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={2}
            placeholder="e.g. Show me cost-per-hire by department for FY26"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button onClick={aiDraft} disabled={busy}>
            <Sparkles className="w-4 h-4 mr-1" /> Draft with AI
          </Button>
          {aiResult && (
            <pre className="bg-slate-50 border rounded-md p-3 text-xs overflow-auto">
              {JSON.stringify(aiResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> New report
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-2">
          <Input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <select
            className="border rounded-md px-2 text-sm"
            value={draft.dataSource}
            onChange={(e) => setDraft({ ...draft, dataSource: e.target.value })}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button onClick={createReport} disabled={busy || !draft.name}>
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{reports.length} saved reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Visualization</th>
                <th className="px-4 py-3">Last run</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name}</p>
                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3">{r.dataSource}</td>
                  <td className="px-4 py-3">{r.visualization}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => runReport(r.id)}>
                      <Play className="w-3.5 h-3.5 mr-1" /> Run
                    </Button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No reports yet. Create one above or describe what you want for the AI to draft.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
