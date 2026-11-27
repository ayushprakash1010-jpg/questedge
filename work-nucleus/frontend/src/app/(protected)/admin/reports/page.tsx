"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus, Play, X, Download, Trash2 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { readResponseError } from "@/lib/api";
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

const VISUALIZATIONS = ["TABLE", "BAR", "LINE", "FUNNEL", "HEATMAP"] as const;

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [draft, setDraft] = useState<any>({
    name: "",
    description: "",
    dataSource: "HIRING",
    visualization: "TABLE",
    filters: [],
    groupBy: [],
    metrics: [{ field: "count", agg: "count" }],
  });
  const [prompt, setPrompt] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [activeReportResult, setActiveReportResult] = useState<any>(null);
  const [resultView, setResultView] = useState<"chart" | "table">("chart");

  async function load() {
    try {
      const res = await fetch("/api/v2/reports");
      if (!res.ok) {
        toast.error(await readResponseError(res, "Failed to load saved reports"));
        return;
      }
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load saved reports");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function createReport() {
    if (!draft.name) return;
    setBusy(true);
    try {
      const payload = {
        name: String(draft.name).trim(),
        ...(draft.description?.trim() ? { description: String(draft.description).trim() } : {}),
        dataSource: draft.dataSource || "HIRING",
        filters: Array.isArray(draft.filters) ? draft.filters : [],
        groupBy: Array.isArray(draft.groupBy) ? draft.groupBy : [],
        metrics: Array.isArray(draft.metrics) && draft.metrics.length
          ? draft.metrics
          : [{ field: "count", agg: "count" }],
        visualization: VISUALIZATIONS.includes(draft.visualization)
          ? draft.visualization
          : "BAR",
      };
      const res = await fetch("/api/v2/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readResponseError(res, "Save failed"));
      await load();
      setDraft({
        name: "",
        description: "",
        dataSource: "HIRING",
        visualization: "TABLE",
        filters: [],
        groupBy: [],
        metrics: [{ field: "count", agg: "count" }],
      });
      setAiResult(null);
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
      if (!res.ok) {
        toast.error(await readResponseError(res, "Could not draft report with AI"));
        return;
      }
      const data = await res.json();
      setAiResult(data);
      setDraft((prev: any) => ({ ...prev, ...data }));
    } catch {
      toast.error("Could not draft report with AI");
    } finally {
      setBusy(false);
    }
  }

  async function runReport(id: string) {
    try {
      const res = await fetch(`/api/v2/reports/${id}/run`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readResponseError(res, "Run failed"));
      const data = await res.json();

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const flattenedRows = rows.map((row: any) => ({
        ...row.group,
        ...row.metrics,
      }));

      setResultView(data?.definition?.visualization === "TABLE" ? "table" : "chart");
      setActiveReportResult({
        definition: data.definition,
        rows: flattenedRows,
      });
      toast.success(`Report returned ${rows.length} rows`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    }
  }

  async function deleteReport(id: string) {
    try {
      const res = await fetch(`/api/v2/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readResponseError(res, "Delete failed"));
      toast.success("Report deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function exportActiveCsv() {
    if (!activeReportResult?.rows?.length) return;
    const keys = Object.keys(activeReportResult.rows[0]);
    const escapeCell = (val: unknown) => {
      const s = val === null || val === undefined ? "" : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csvLines = [
      keys.map(escapeCell).join(","),
      ...activeReportResult.rows.map((r: any) => keys.map((k) => escapeCell(r[k])).join(",")),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeReportResult.definition.name || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <CardContent className="grid gap-2 sm:grid-cols-4">
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
          <Select
            value={draft.visualization || "TABLE"}
            onChange={(e) => setDraft({ ...draft, visualization: e.target.value })}
          >
            {VISUALIZATIONS.map((v) => (
              <option key={v} value={v}>
                {v}
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
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runReport(r.id)}
                        >
                          <Play className="h-3.5 w-3.5" /> Run
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => deleteReport(r.id)}
                          title="Delete report"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>

      {activeReportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{activeReportResult.definition.name}</h3>
                {activeReportResult.definition.description && (
                  <p className="text-sm text-slate-500">{activeReportResult.definition.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeReportResult.rows.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResultView((v) => (v === "chart" ? "table" : "chart"))}
                    >
                      {resultView === "chart" ? "Table View" : "Chart View"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportActiveCsv}>
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </Button>
                  </>
                )}
                <button
                  onClick={() => setActiveReportResult(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-2 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-auto bg-slate-50/30">
              {activeReportResult.rows.length === 0 ? (
                <div className="text-center text-slate-500 py-20 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Sparkles className="h-5 w-5 text-slate-400" />
                  </div>
                  <h4 className="font-semibold text-slate-700">No data found</h4>
                  <p className="text-sm mt-1">The query executed successfully but returned 0 rows.</p>
                </div>
              ) : resultView === "chart" &&
                (activeReportResult.definition.visualization === "BAR" ||
                  activeReportResult.definition.visualization === "LINE" ||
                  activeReportResult.definition.visualization === "FUNNEL" ||
                  activeReportResult.definition.visualization === "HEATMAP") ? (
                (() => {
                  const firstRow = activeReportResult.rows[0] || {};
                  const groupKey =
                    activeReportResult.definition.groupBy?.[0] ||
                    Object.keys(firstRow)[0] ||
                    "group";
                  const metricKey =
                    Object.keys(firstRow).find(
                      (k) => k !== groupKey && typeof firstRow[k] === "number"
                    ) ||
                    Object.keys(firstRow).find((k) => k !== groupKey) ||
                    "count";
                  const viz = activeReportResult.definition.visualization;

                  if (viz === "LINE") {
                    return (
                      <div className="h-[400px] w-full p-4 bg-white rounded-xl border border-slate-200">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={activeReportResult.rows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey={groupKey} tick={{ fill: "#64748b", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey={metricKey} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  }

                  if (viz === "FUNNEL") {
                    const sortedRows = [...activeReportResult.rows].sort(
                      (a, b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0)
                    );
                    return (
                      <div className="h-[400px] w-full p-4 bg-white rounded-xl border border-slate-200">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={sortedRows} margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
                            <YAxis type="category" dataKey={groupKey} tick={{ fill: "#64748b", fontSize: 12 }} width={110} />
                            <Tooltip />
                            <Bar dataKey={metricKey} fill="#4f46e5" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  }

                  if (viz === "HEATMAP") {
                    const maxVal = Math.max(
                      ...activeReportResult.rows.map((r: any) => Number(r[metricKey] || 0)),
                      1
                    );
                    return (
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 bg-white p-4 rounded-xl border border-slate-200">
                        {activeReportResult.rows.map((r: any, idx: number) => {
                          const val = Number(r[metricKey] || 0);
                          const ratio = val / maxVal;
                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-indigo-200 p-4 transition-colors"
                              style={{
                                backgroundColor: `rgba(79, 70, 229, ${Math.max(0.08, ratio * 0.85)})`,
                                color: ratio > 0.5 ? "#ffffff" : "#0f172a",
                              }}
                            >
                              <p className="text-xs font-medium opacity-80 truncate">
                                {String(r[groupKey] ?? "Total")}
                              </p>
                              <p className="mt-1 text-2xl font-bold">{val.toLocaleString("en-IN")}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <div className="h-[400px] w-full p-4 bg-white rounded-xl border border-slate-200">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeReportResult.rows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey={groupKey}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#e2e8f0" }}
                          />
                          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            cursor={{ fill: "#f1f5f9" }}
                          />
                          <Bar dataKey={metricKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                      <tr>
                        {Object.keys(activeReportResult.rows[0]).map((k) => (
                          <th key={k} className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">{k.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReportResult.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          {Object.values(row).map((v: any, j: number) => (
                            <td key={j} className="px-6 py-4 text-slate-700">
                              {v === null || v === undefined ? (
                                <span className="text-slate-300 italic">None</span>
                              ) : (
                                String(v)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
