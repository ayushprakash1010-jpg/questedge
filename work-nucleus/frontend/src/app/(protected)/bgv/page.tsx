"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Copy,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "@/components/ui/toaster";
import { readResponseError } from "@/lib/api";
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
  consentToken?: string;
  riskScore: string | null;
  consentedAt?: string | null;
  candidate: { id: string; name: string; email: string };
  checks: BgvCheck[];
  createdAt: string;
}

interface BgvCandidateOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  applications: Array<{
    id: string;
    status: string;
    hiringPlan: { id: string; title: string };
    offer: { id: string; status: string } | null;
  }>;
  bgvProfiles: Array<{ id: string; status: string; offerId: string | null }>;
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
    key: "PAN",
    short: "PAN",
    label: "PAN Identity Verification",
    vendor: "NSDL / Tax ID",
    Icon: Lock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    chip: "bg-blue-50 text-blue-700",
    tag: "Mandatory",
    tagClass: "bg-blue-50 text-blue-700",
  },
  {
    key: "AADHAAR",
    short: "Aadh",
    label: "Aadhaar Verification",
    vendor: "UIDAI / DigiLocker",
    Icon: ShieldCheck,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    chip: "bg-sky-50 text-sky-700",
    tag: "Mandatory",
    tagClass: "bg-sky-50 text-sky-700",
  },
  {
    key: "EMPLOYMENT_HISTORY",
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
    key: "ADDRESS_CURRENT",
    short: "Addr",
    label: "Current Address Verification",
    vendor: "Physical / Digital",
    Icon: MapPin,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    chip: "bg-amber-50 text-amber-700",
    tag: "Recommended",
    tagClass: "bg-amber-50 text-amber-700",
  },
  {
    key: "CRIMINAL_COURT",
    short: "Crim",
    label: "Criminal & Court Record",
    vendor: "eCourts / National DB",
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

const EXTRA_CHECK_TYPES: Array<{ key: string; short: string; label: string }> = [
  { key: "PASSPORT", short: "Pass", label: "Passport Verification" },
  { key: "ADDRESS_PERMANENT", short: "PAdd", label: "Permanent Address Verification" },
  { key: "POLICE_VERIFICATION", short: "Pol", label: "Police Verification" },
  { key: "CREDIT_CHECK", short: "Cred", label: "Credit History Check" },
  { key: "GLOBAL_DATABASE", short: "Glob", label: "Global Sanctions / Watchlist" },
  { key: "DRUG_TEST", short: "Drug", label: "Drug Screening" },
];

const ALL_SELECTABLE_CHECKS = [
  ...CHECK_TYPES.map((c) => ({ key: c.key, label: c.label, vendor: c.vendor })),
  ...EXTRA_CHECK_TYPES.map((c) => ({ key: c.key, label: c.label, vendor: "Extended check" })),
];

const DEFAULT_PACKAGE_KEYS = [
  "PAN",
  "AADHAAR",
  "EMPLOYMENT_HISTORY",
  "EDUCATION",
  "ADDRESS_CURRENT",
];

const checkChipByType: Record<string, { short: string; class: string }> = {
  ...Object.fromEntries(
    CHECK_TYPES.map((c) => [c.key, { short: c.short, class: c.chip }])
  ),
  ...Object.fromEntries(
    EXTRA_CHECK_TYPES.map((c) => [
      c.key,
      { short: c.short, class: "bg-slate-100 text-slate-700" },
    ])
  ),
};

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [packageChecks, setPackageChecks] = useState<string[]>(DEFAULT_PACKAGE_KEYS);
  const [customisingPackage, setCustomisingPackage] = useState(false);

  const [initiateOpen, setInitiateOpen] = useState(false);
  const [candidates, setCandidates] = useState<BgvCandidateOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [retentionDays, setRetentionDays] = useState("90");
  const [initiateChecks, setInitiateChecks] = useState<string[]>(DEFAULT_PACKAGE_KEYS);
  const [initiating, setInitiating] = useState(false);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  const [orgBgvProvider, setOrgBgvProvider] = useState<string>("authbridge");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    try {
      const r = await fetch(`/api/v2/bgv${qs}`);
      if (!r.ok) {
        throw new Error(await readResponseError(r, "Failed to load BGV profiles"));
      }
      const j = await r.json();
      setRows(Array.isArray(j) ? j : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load BGV profiles";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadProfiles();
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const provider = data?.settings?.bgvProvider;
        if (typeof provider === "string" && provider.trim()) {
          setOrgBgvProvider(provider.trim().toLowerCase());
        }
      })
      .catch(() => {});
  }, [loadProfiles]);

  const openInitiateModal = async () => {
    setInitiateOpen(true);
    setInitiateError(null);
    setInitiateChecks(packageChecks);
    setSelectedOfferId("");
    setLoadingCandidates(true);
    try {
      const res = await fetch("/api/v2/bgv/candidates");
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load candidates"));
      }
      const list: BgvCandidateOption[] = await res.json();
      const arr = Array.isArray(list) ? list : [];
      setCandidates(arr);
      const firstEligible = arr.find((c) => c.bgvProfiles.length === 0) ?? arr[0];
      if (firstEligible) {
        setSelectedCandidateId(firstEligible.id);
        const firstOffer = firstEligible.applications.find((a) => a.offer)?.offer?.id ?? "";
        setSelectedOfferId(firstOffer);
      }
    } catch (err) {
      setInitiateError(err instanceof Error ? err.message : "Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const togglePackageCheck = (key: string) => {
    setPackageChecks((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key]
    );
  };

  const toggleInitiateCheck = (key: string) => {
    setInitiateChecks((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key]
    );
  };

  const handleInitiateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId || initiateChecks.length === 0) return;
    setInitiating(true);
    setInitiateError(null);
    try {
      const payload: Record<string, unknown> = {
        candidateId: selectedCandidateId,
        checkTypes: initiateChecks,
        retentionDays: parseInt(retentionDays, 10) || 90,
      };
      if (selectedOfferId) {
        payload.offerId = selectedOfferId;
      }

      const res = await fetch("/api/v2/bgv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to initiate BGV"));
      }
      const created: BgvRow = await res.json();
      toast.success("BGV initiated — DPDP consent link generated");
      setInitiateOpen(false);
      await loadProfiles();
      setSelectedId(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initiate BGV";
      setInitiateError(msg);
      toast.error(msg);
    } finally {
      setInitiating(false);
    }
  };

  const selectedCandidateObj = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

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
                <Button size="sm" onClick={openInitiateModal}>
                  <Plus className="h-4 w-4" />
                  Initiate BGV
                </Button>
              </div>
            }
          />

          {loadError && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={loadProfiles}>
                Retry
              </Button>
            </div>
          )}

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
              <CardTitle className="text-base">
                Default Check Package ({packageChecks.length} selected)
              </CardTitle>
              <Button
                variant={customisingPackage ? "default" : "outline"}
                size="sm"
                onClick={() => setCustomisingPackage((v) => !v)}
              >
                {customisingPackage ? "Done" : "Customise"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {CHECK_TYPES.map((ct) => {
                  const isSelected = packageChecks.includes(ct.key);
                  const Icon = ct.Icon;
                  return (
                    <button
                      type="button"
                      key={ct.key}
                      disabled={!customisingPackage}
                      onClick={() => togglePackageCheck(ct.key)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors disabled:cursor-default",
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200"
                          : "border-slate-200 bg-white opacity-70 hover:border-indigo-200"
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
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Active Vendor:</span>
                <Select className="w-44 text-xs" value={orgBgvProvider} disabled>
                  <option value="authbridge">AuthBridge</option>
                  <option value="ongrid">OnGrid</option>
                  <option value="idfy">IDfy</option>
                </Select>
                <Link
                  href="/admin/settings"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Change in Org Settings
                </Link>
                <span className="text-xs text-slate-400">
                  · Avg TAT: 5–7 business days
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
                    description="Start a DPDP-consented background check for any org candidate."
                    action={
                      <Button size="sm" onClick={openInitiateModal}>
                        <Plus className="h-4 w-4" />
                        Initiate BGV
                      </Button>
                    }
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

      {/* Initiate BGV Modal */}
      {initiateOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Initiate BGV</h2>
                  <p className="text-xs text-slate-500">Creates a DPDP-consented verification request</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInitiateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close Initiate BGV modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="space-y-4 px-6 py-5">
              {loadingCandidates ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  Loading candidates...
                </div>
              ) : (
                <>
                  {initiateError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {initiateError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Candidate *
                    </label>
                    {candidates.length === 0 ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        No candidates found in your organization yet.
                      </p>
                    ) : (
                      <Select
                        value={selectedCandidateId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setSelectedCandidateId(nextId);
                          const c = candidates.find((item) => item.id === nextId);
                          setSelectedOfferId(c?.applications.find((a) => a.offer)?.offer?.id ?? "");
                        }}
                      >
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.email})
                            {c.bgvProfiles.length > 0 ? " — has BGV" : ""}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>

                  {selectedCandidateObj &&
                    selectedCandidateObj.applications.some((a) => a.offer) && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Link to Offer (optional)
                        </label>
                        <Select
                          value={selectedOfferId}
                          onChange={(e) => setSelectedOfferId(e.target.value)}
                        >
                          <option value="">Standalone candidate BGV (no offer)</option>
                          {selectedCandidateObj.applications
                            .filter((a) => a.offer)
                            .map((a) => (
                              <option key={a.offer!.id} value={a.offer!.id}>
                                {a.hiringPlan.title} — Offer ({a.offer!.status})
                              </option>
                            ))}
                        </Select>
                      </div>
                    )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Verification Checks ({initiateChecks.length} selected) *
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
                      {ALL_SELECTABLE_CHECKS.map((chk) => {
                        const checked = initiateChecks.includes(chk.key);
                        return (
                          <label
                            key={chk.key}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer",
                              checked
                                ? "border-indigo-300 bg-indigo-50/60 text-indigo-900"
                                : "border-slate-200 bg-white text-slate-700"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleInitiateCheck(chk.key)}
                              className="h-3.5 w-3.5 accent-indigo-600"
                            />
                            <span className="truncate">{chk.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Retention Days
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" onClick={() => setInitiateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loadingCandidates ||
                    initiating ||
                    !selectedCandidateId ||
                    initiateChecks.length === 0
                  }
                >
                  {initiating ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Initiating...
                    </>
                  ) : (
                    "Initiate BGV"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
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
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const consentedTypes = new Set(row.checks.map((c) => c.type));
  const discrepancyChecks = row.checks.filter(
    (c) => c.finding === "DISCREPANCY"
  );
  const consentPath = row.consentToken ? `/bgv/consent/${row.consentToken}` : null;

  const copyConsentUrl = () => {
    if (!consentPath) {
      toast.error("Consent token unavailable for this profile");
      return;
    }
    const url = `${window.location.origin}${consentPath}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Candidate consent link copied to clipboard");
  };

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
            {CHECK_TYPES.slice(0, 6).map((ct) => {
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
            onClick={() => setShowEmailPreview((v) => !v)}
            disabled={!consentPath}
          >
            <Mail className="h-3 w-3" />
            {showEmailPreview ? "Hide Email" : "Preview Email"}
          </Button>
          <Button
            size="sm"
            className="flex-1 justify-center"
            disabled={!!row.consentedAt || !consentPath}
            onClick={copyConsentUrl}
          >
            <Send className="h-3 w-3" />
            {row.consentedAt ? "Consent Received" : "Copy Consent Link"}
          </Button>
        </div>
        {showEmailPreview && consentPath && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700 space-y-1.5">
            <p className="font-semibold text-slate-900">
              Subject: Background Verification Consent Request
            </p>
            <p>
              Hi {row.candidate.name}, please review your DPDP notice and verify via OTP:
            </p>
            <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-indigo-700">
              <span className="truncate">{consentPath}</span>
              <button type="button" onClick={copyConsentUrl} aria-label="Copy consent URL">
                <Copy className="h-3 w-3 shrink-0" />
              </button>
            </div>
          </div>
        )}
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
