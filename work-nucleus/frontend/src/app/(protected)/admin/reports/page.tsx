"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

interface ReportDef {
  id: string;
  name: string;
  description: string | null;
  dataSource: string;
  visualization: string;
  lastRunAt: string | null;
}

const SOURCES = [
  "HIRING",
  "APPLICATIONS",
  "APPRAISAL",
  "COMPENSATION",
  "BGV",
  "ATTRITION",
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    dataSource: "HIRING",
  });
  const [prompt, setPrompt] = useState("");
  const [aiResult, setAiResult] = useState<unknown>(null);
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
      if (!res.ok) throw new Error("Save failed");
      await load();
      setDraft({ name: "", description: "", dataSource: "HIRING" });
      toast.success("Report saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
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
    try {
      const res = await fetch(`/api/v2/reports/${id}/run`, { method: "POST" });
      if (!res.ok) throw new Error("Run failed");
      const data = await res.json();
      toast.success(`Report returned ${data.rows.length} rows`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Reports"
        subtitle="Build saved reports across hiring, appraisals, compensation, BGV, and attrition."
      />

      <Card className="mb-4 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            Describe a report (AI draft)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={2}
            placeholder="e.g. Show me cost-per-hire by department for FY26"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button variant="ai" size="sm" onClick={aiDraft} disabled={busy}>
            <Sparkles className="h-3.5 w-3.5" /> Draft with AI
          </Button>
          {aiResult ? (
            <pre className="overflow-auto rounded-md border border-slate-200/60 bg-slate-50 p-3 text-xs">
              {JSON.stringify(aiResult, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> New report
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select
            value={draft.dataSource}
            onChange={(e) => setDraft({ ...draft, dataSource: e.target.value })}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button onClick={createReport} disabled={busy || !draft.name}>
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{reports.length} saved reports</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {reports.length === 0 ? (
            <p className="px-5 pb-5 text-center text-sm text-slate-500">
              No reports yet. Create one above or describe what you want for the
              AI to draft.
            </p>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Source</DataTableHead>
                  <DataTableHead>Visualization</DataTableHead>
                  <DataTableHead>Last run</DataTableHead>
                  <DataTableHead></DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {reports.map((r) => (
                  <DataTableRow key={r.id}>
                    <DataTableCell>
                      <p className="font-medium text-slate-900">{r.name}</p>
                      {r.description && (
                        <p className="text-xs text-slate-500">{r.description}</p>
                      )}
                    </DataTableCell>
                    <DataTableCell>{r.dataSource}</DataTableCell>
                    <DataTableCell>{r.visualization}</DataTableCell>
                    <DataTableCell className="text-xs text-slate-500">
                      {r.lastRunAt
                        ? new Date(r.lastRunAt).toLocaleString()
                        : "Never"}
                    </DataTableCell>
                    <DataTableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runReport(r.id)}
                      >
                        <Play className="h-3.5 w-3.5" /> Run
                      </Button>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
