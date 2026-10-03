"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  IndianRupee,
  Lock,
  Briefcase,
  GraduationCap,
  MapPin,
  ShieldAlert,
  Users,
  AlertTriangle,
  Mail,
  Send,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

// BGV surface — design-system-v2/ui-kit/09-BGV-Consent.html.
// Master-detail layout: status strip + check package + tracker on the left,
// 320 px right rail (consent preview + timeline + discrepancy alert) when a
// candidate is selected.

interface BgvCheck {
  id: string;
  type: string;
  status: string;
  finding: string;
  costInPaise: number | null;
}

interface BgvRow {
  id: string;
  status: string;
  vendor: string;
  riskScore: string | null;
  consentedAt?: string | null;
  candidate: { id: string; name: string; email: string };
  checks: BgvCheck[];
  createdAt: string;
}

const FILTER_OPTIONS = [
  "",
  "CONSENT_PENDING",
  "IN_PROGRESS",
  "NEEDS_REVIEW",
  "COMPLETED",
  "CANCELLED",
];

// Status pill mapping — mirrors the colors in the mockup.
const statusPillClass: Record<string, string> = {
  CONSENT_PENDING:
    "bg-amber-50 text-amber-800 border-amber-200",
  NEEDS_REVIEW:
    "bg-red-50 text-red-800 border-red-200",
  IN_PROGRESS:
    "bg-blue-50 text-blue-800 border-blue-200",
  COMPLETED:
    "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED:
    "bg-slate-100 text-slate-700 border-slate-200",
  NOT_STARTED:
    "bg-slate-100 text-slate-700 border-slate-200",
};

// Strip dots
const statusStrip: Array<{
  key: string;
  label: string;
  dot: string;
}> = [
  { key: "CONSENT_PENDING", label: "Pending Consent", dot: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "In Progress", dot: "bg-indigo-500" },
  { key: "COMPLETED", label: "Cleared", dot: "bg-emerald-500" },
  { key: "NEEDS_REVIEW", label: "Discrepancy", dot: "bg-red-500" },
  { key: "CANCELLED", label: "Cancelled", dot: "bg-purple-500" },
];

// Per-check-type chip colors + icons + display text (the mockup uses 4-letter
// abbreviations to keep the table compact).
const CHECK_TYPES: Array<{
  key: string;
  short: string;
  label: string;
  vendor: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  chip: string;
  tag: string;
  tagClass: string;
}> = [
  {
    key: "IDENTITY",
    short: "ID",
    label: "Identity Verification",
    vendor: "Aadhaar + PAN",
    Icon: Lock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    chip: "bg-blue-50 text-blue-700",
    tag: "Mandatory",
    tagClass: "bg-blue-50 text-blue-700",
  },
  {
    key: "EMPLOYMENT",
    short: "Emp",
    label: "Employment History",
    vendor: "Last 2 employers",
    Icon: Briefcase,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    chip: "bg-emerald-50 text-emerald-700",
    tag: "Mandatory",
    tagClass: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "EDUCATION",
    short: "Edu",
    label: "Education Check",
    vendor: "Highest degree",
    Icon: GraduationCap,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    chip: "bg-purple-50 text-purple-700",
    tag: "Mandatory",
    tagClass: "bg-purple-50 text-purple-700",
  },
  {
    key: "ADDRESS",
    short: "Addr",
    label: "Address Verification",
    vendor: "Current + Permanent",
    Icon: MapPin,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    chip: "bg-amber-50 text-amber-700",
    tag: "Recommended",
    tagClass: "bg-amber-50 text-amber-700",
  },
  {
    key: "CRIMINAL",
    short: "Crim",
    label: "Criminal Record",
    vendor: "National database",
    Icon: ShieldAlert,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    chip: "bg-red-50 text-red-700",
    tag: "Role-specific",
    tagClass: "bg-red-50 text-red-700",
  },
  {
    key: "REFERENCE",
    short: "Ref",
    label: "Reference Check",
    vendor: "2 professional refs",
    Icon: Users,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    chip: "bg-cyan-50 text-cyan-700",
    tag: "Optional",
    tagClass: "bg-cyan-50 text-cyan-700",
  },
];

const checkChipByType: Record<string, { short: string; class: string }> =
  Object.fromEntries(
    CHECK_TYPES.map((c) => [c.key, { short: c.short, class: c.chip }])
  );

function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function BgvListPage() {
  const [rows, setRows] = useState<BgvRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/v2/bgv${qs}`)
      .then((r) => r.json())
      .then((j) => setRows(Array.isArray(j) ? j : []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  );

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* List pane */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <PageHeader
            title="Background Verification"
            subtitle="Track consent status, check progress, and manage BGV vendors."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/bgv/cost">
                  <Button variant="outline" size="sm">
                    <IndianRupee className="h-4 w-4" />
                    Cost report
                  </Button>
                </Link>
                <Button size="sm" disabled title="Initiate from candidate detail">
                  <Plus className="h-4 w-4" />
                  Initiate BGV
                </Button>
              </div>
            }
          />

          {/* Status strip */}
          <div className="mb-5 flex flex-wrap gap-2">
            {statusStrip.map((s) => (
              <button
                key={s.key}
                onClick={() =>
                  setStatusFilter(statusFilter === s.key ? "" : s.key)
                }
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2 text-left shadow-[var(--shadow-xs)] transition-colors",
                  statusFilter === s.key
                    ? "border-indigo-300 bg-indigo-50/40"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                <span>
                  <span className="block text-base font-bold text-slate-900">
                    {counts[s.key] ?? 0}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {s.label}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Default Check Package */}
          <Card className="mb-5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Default Check Package</CardTitle>
              <Button variant="outline" size="sm" disabled>
                Customise
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {CHECK_TYPES.map((ct) => {
                  const isMandatory = ct.tag === "Mandatory";
                  const Icon = ct.Icon;
                  return (
                    <div
                      key={ct.key}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        isMandatory
                          ? "border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200"
                          : "border-slate-200 bg-white hover:border-indigo-200"
                      )}
                    >
                      <div
                        className={cn(
                          "mb-2 flex h-8 w-8 items-center justify-center rounded-lg",
                          ct.iconBg
                        )}
                      >
                        <Icon className={cn("h-4 w-4", ct.iconColor)} />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        {ct.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {ct.vendor}
                      </p>
                      <span
                        className={cn(
                          "mt-1.5 inline-block rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold",
                          ct.tagClass
                        )}
                      >
                        {ct.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Vendor:</span>
                <Select className="w-44 text-xs" disabled>
                  <option>AuthBridge</option>
                  <option>KPMG BGV</option>
                  <option>SpringVerify</option>
                  <option>IDfy</option>
                </Select>
                <span className="text-xs text-slate-400">
                  Avg TAT: 5–7 business days
                </span>
              </div>
            </CardContent>
          </Card>

          {/* BGV Tracker */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">BGV Tracker</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-40 text-xs"
                >
                  {FILTER_OPTIONS.map((s) => (
                    <option key={s || "all"} value={s}>
                      {s ? statusLabel(s) : "All Statuses"}
                    </option>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {loading ? (
                <div className="space-y-3 p-5 pt-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="block" className="h-12 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="p-5 pt-0">
                  <EmptyState
                    icon={<ShieldCheck className="h-6 w-6" />}
                    title="No BGV profiles"
                    description="Initiate one from the candidate detail page."
                  />
                </div>
              ) : (
                <DataTable className="rounded-none border-0 shadow-none">
                  <DataTableHeader>
                    <tr>
                      <DataTableHead>Candidate</DataTableHead>
                      <DataTableHead>Vendor</DataTableHead>
                      <DataTableHead>Checks</DataTableHead>
                      <DataTableHead>Consent</DataTableHead>
                      <DataTableHead>Status</DataTableHead>
                      <DataTableHead>Risk</DataTableHead>
                      <DataTableHead className="text-right">Actions</DataTableHead>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {rows.map((r) => {
                      const isCleared = r.status === "COMPLETED";
                      const isDiscrep = r.status === "NEEDS_REVIEW";
                      return (
                        <DataTableRow
                          key={r.id}
                          selected={selectedId === r.id}
                          onClick={() => setSelectedId(r.id)}
                        >
                          <DataTableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar size="sm" className="h-7 w-7 text-[10px]">
                                <AvatarFallback>
                                  {getInitials(r.candidate.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {r.candidate.name}
                                </p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {r.candidate.email}
                                </p>
                              </div>
                            </div>
                          </DataTableCell>
                          <DataTableCell className="text-slate-500">
                            {r.vendor}
                          </DataTableCell>
                          <DataTableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.checks.map((c) => {
                                const meta =
                                  checkChipByType[c.type] ??
                                  ({
                                    short: c.type.slice(0, 4),
                                    class: "bg-slate-100 text-slate-600",
                                  } as const);
                                return (
                                  <span
                                    key={c.id}
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[9px] font-bold",
                                      meta.class
                                    )}
                                  >
                                    {meta.short}
                                  </span>
                                );
                              })}
                            </div>
                          </DataTableCell>
                          <DataTableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                r.consentedAt
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              )}
                            >
                              {r.consentedAt ? "Received" : "Awaiting"}
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                statusPillClass[r.status] ??
                                  "bg-slate-100 text-slate-700 border-slate-200"
                              )}
                            >
                              {isDiscrep && (
                                <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                              )}
                              {statusLabel(r.status)}
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            {r.riskScore ? (
                              <span
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                                  r.riskScore === "GREEN" &&
                                    "bg-emerald-50 text-emerald-700",
                                  r.riskScore === "AMBER" &&
                                    "bg-amber-50 text-amber-700",
                                  r.riskScore === "RED" &&
                                    "bg-red-50 text-red-700"
                                )}
                              >
                                {r.riskScore}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </DataTableCell>
                          <DataTableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/bgv/${r.id}`}>
                              <Button
                                variant={isDiscrep ? "destructive" : "outline"}
                                size="sm"
                              >
                                {isDiscrep
                                  ? "Review"
                                  : isCleared
                                    ? "Report"
                                    : !r.consentedAt
                                      ? "Send Link"
                                      : "View"}
                              </Button>
                            </Link>
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail rail */}
      {selected && (
        <BgvDetailRail
          row={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Right rail
// ─────────────────────────────────────────────────────────────────────────

function BgvDetailRail({
  row,
  onClose,
}: {
  row: BgvRow;
  onClose: () => void;
}) {
  const consentedTypes = new Set(row.checks.map((c) => c.type));
  const discrepancyChecks = row.checks.filter(
    (c) => c.finding === "DISCREPANCY"
  );

  return (
    <aside className="flex w-full max-w-md shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white lg:w-[320px]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Selected Candidate
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {row.candidate.name}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {row.candidate.email}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      {/* Consent Form Preview */}
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Consent Form Preview
        </p>
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4">
          <p className="mb-2 text-[13px] font-bold text-slate-900">
            Background Verification Consent
          </p>
          <p className="mb-3 text-[11px] leading-relaxed text-slate-600">
            By submitting this form, I,{" "}
            <strong>{row.candidate.name}</strong>, authorise QuestEdge and
            its authorised BGV partner to conduct background checks as part of
            the pre-employment process.
          </p>
          <div className="space-y-1.5">
            {CHECK_TYPES.slice(0, 5).map((ct) => {
              const enabled = consentedTypes.has(ct.key);
              return (
                <label
                  key={ct.key}
                  className="flex items-start gap-2 text-[11px] leading-snug text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    readOnly
                    className="mt-0.5 h-3 w-3 shrink-0 accent-indigo-600"
                  />
                  <span>
                    {ct.label} ({ct.vendor})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            disabled
          >
            <Mail className="h-3 w-3" />
            Preview Email
          </Button>
          <Button size="sm" className="flex-1 justify-center" disabled={!!row.consentedAt}>
            <Send className="h-3 w-3" />
            {row.consentedAt ? "Consent Received" : "Send Consent"}
          </Button>
        </div>
      </div>

      {/* Check Timeline */}
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Check Timeline
        </p>
        {row.checks.length === 0 ? (
          <p className="text-xs text-slate-400">No checks scheduled yet.</p>
        ) : (
          <ol className="space-y-3">
            {row.checks.map((c, idx) => {
              const meta = CHECK_TYPES.find((t) => t.key === c.type);
              const isDone = c.status === "COMPLETED";
              const isInProgress = c.status === "IN_PROGRESS";
              return (
                <li key={c.id} className="relative flex gap-2.5">
                  {idx < row.checks.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[10px] top-6 h-full w-px bg-slate-200"
                    />
                  )}
                  <span
                    className={cn(
                      "z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold",
                      isDone &&
                        "border-emerald-500 bg-emerald-500 text-white",
                      isInProgress &&
                        "border-indigo-600 bg-white text-indigo-600",
                      !isDone &&
                        !isInProgress &&
                        "border-slate-200 bg-white text-slate-400"
                    )}
                  >
                    {isDone ? "✓" : idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs font-medium",
                        isInProgress
                          ? "font-semibold text-indigo-700"
                          : isDone
                            ? "text-slate-700"
                            : "text-slate-400"
                      )}
                    >
                      {meta?.label ?? c.type}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px]",
                        isInProgress ? "text-indigo-500" : "text-slate-400"
                      )}
                    >
                      {c.finding === "DISCREPANCY"
                        ? "⚠ Discrepancy found"
                        : isInProgress
                          ? "In progress"
                          : isDone
                            ? "Cleared"
                            : "Pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Discrepancy alert */}
      {discrepancyChecks.length > 0 && (
        <div className="px-5 py-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-red-100">
                <AlertTriangle className="h-3 w-3 text-red-600" />
              </span>
              <span className="text-xs font-bold text-red-900">
                Discrepancy — {row.candidate.name.split(" ")[0]}
              </span>
            </div>
            <ul className="mb-3 space-y-1.5 text-xs leading-relaxed text-red-900">
              {discrepancyChecks.map((c) => {
                const meta = CHECK_TYPES.find((t) => t.key === c.type);
                return (
                  <li key={c.id}>
                    <strong>{meta?.label ?? c.type}:</strong>{" "}
                    {c.finding === "DISCREPANCY"
                      ? "Discrepancy reported by vendor."
                      : c.finding}
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-1.5">
              <Link href={`/bgv/${row.id}`} className="flex-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-center text-[11px]"
                >
                  Review
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-center text-[11px]"
                disabled
              >
                Request Clarification
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
