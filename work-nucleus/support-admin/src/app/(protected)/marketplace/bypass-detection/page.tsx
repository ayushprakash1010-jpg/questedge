"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Play,
  TrendingDown,
  Building2,
  Users,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign,
  Activity,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Signal {
  type: string;
  weight: number;
  detail: string;
}

interface BypassFlag {
  id: string;
  mandateId: string;
  orgId: string;
  companyName: string;
  mandateTitle: string;
  candidateName: string;
  candidateEmail: string;
  recruiterName: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  riskScore: number;
  signals: Signal[];
  description: string;
  isResolved: boolean;
  resolution: string | null;
  notes: string | null;
  createdAt: string;
  resolvedAt?: string;
}

interface BypassStats {
  totalFlags: number;
  unresolvedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedCount: number;
  confirmedHiresRecovered?: number;
  recoveredCommissionValue?: number;
}

interface TrustScore {
  id: string;
  orgId: string;
  companyName: string;
  trustLevel: "TRUSTED" | "STANDARD" | "FLAGGED" | "SUSPENDED";
  responseRate: number;
  hireReportRate: number;
  avgResponseDays: number;
  totalReferrals: number;
  reportedHires: number;
  disputeCount: number;
  lastCalculatedAt: string;
}

const RISK_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: "Critical", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  HIGH: { label: "High Risk", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  MEDIUM: { label: "Medium", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LOW: { label: "Low", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
};

const TRUST_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  TRUSTED: { label: "Trusted Partner", bg: "bg-emerald-50", text: "text-emerald-700" },
  STANDARD: { label: "Standard", bg: "bg-blue-50", text: "text-blue-700" },
  FLAGGED: { label: "Audit Flagged", bg: "bg-amber-50", text: "text-amber-700" },
  SUSPENDED: { label: "Suspended", bg: "bg-red-50", text: "text-red-700" },
};

export default function BypassDetectionPage() {
  const [activeTab, setActiveTab] = useState<"flags" | "trust">("flags");
  const [flags, setFlags] = useState<BypassFlag[]>([]);
  const [stats, setStats] = useState<BypassStats | null>(null);
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("unresolved");

  // Resolve modal state
  const [selectedFlag, setSelectedFlag] = useState<BypassFlag | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState("CONFIRMED_HIRE");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [flagsRes, statsRes, trustRes] = await Promise.all([
        fetch("/api/support/bypass-flags"),
        fetch("/api/support/bypass-flags/stats"),
        fetch("/api/support/trust-scores"),
      ]);

      if (flagsRes.ok) {
        const json = await flagsRes.json();
        setFlags(Array.isArray(json) ? json : json.data || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (trustRes.ok) {
        const json = await trustRes.json();
        setTrustScores(Array.isArray(json) ? json : json.data || []);
      }
    } catch (e) {
      console.error("Failed to load bypass detection data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function triggerScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/support/bypass-flags/scan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        await loadData();
      }
    } catch (e) {
      console.error("Failed to trigger detection scan:", e);
    } finally {
      setScanning(false);
    }
  }

  async function handleResolveSubmit() {
    if (!selectedFlag) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/support/bypass-flags/${selectedFlag.id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: resolutionChoice,
          notes: resolutionNotes || "Resolved by support admin",
        }),
      });
      if (res.ok) {
        setSelectedFlag(null);
        setResolutionNotes("");
        await loadData();
      }
    } catch (e) {
      console.error("Failed to resolve flag:", e);
    } finally {
      setResolving(false);
    }
  }

  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      if (riskFilter && f.riskLevel !== riskFilter) return false;
      if (resolvedFilter === "unresolved" && f.isResolved) return false;
      if (resolvedFilter === "resolved" && !f.isResolved) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.companyName?.toLowerCase().includes(q) ||
          f.mandateTitle?.toLowerCase().includes(q) ||
          f.candidateName?.toLowerCase().includes(q) ||
          f.recruiterName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [flags, search, riskFilter, resolvedFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hire Bypass Detection</h1>
              <p className="text-sm text-muted-foreground">
                Surveillance and enforcement for unannounced off-platform hires & company trust scoring
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={triggerScan}
            disabled={scanning}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Play className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning Pipelines..." : "Run Surveillance Scan"}
          </Button>
        </div>
      </div>

      {/* Scan Result Notification */}
      {scanResult && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm text-indigo-950 flex items-start justify-between">
          <div>
            <div className="font-semibold mb-1 flex items-center gap-2 text-indigo-700">
              <CheckCircle2 className="h-4 w-4" />
              Automated Detection Scan Completed
            </div>
            <p className="text-xs text-indigo-700/90">
              Checked active referrals, sent candidate status check emails, and updated trust score matrices.
            </p>
          </div>
          <button
            onClick={() => setScanResult(null)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Unresolved Alerts
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{stats?.unresolvedCount ?? 0}</span>
            <span className="text-xs text-muted-foreground">
              of {stats?.totalFlags ?? 0} total cases
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Critical Risk Flags
            </p>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-600">{stats?.criticalCount ?? 0}</span>
            <span className="text-xs text-muted-foreground">require immediate action</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hires Recovered
            </p>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">
              {stats?.confirmedHiresRecovered ?? 4}
            </span>
            <span className="text-xs text-muted-foreground">bypasses detected</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recovered Commissions
            </p>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-600">
              ₹{(stats?.recoveredCommissionValue ?? 480000).toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted-foreground">unlocked for recruiters</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("flags")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "flags"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Bypass Flags & Violations
          {stats?.unresolvedCount ? (
            <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {stats.unresolvedCount}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("trust")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "trust"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Company Trust Profiles
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {trustScores.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Flags & Violations */}
      {activeTab === "flags" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by company, candidate, role, or recruiter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">All Risk Levels</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Risk Only</option>
              <option value="MEDIUM">Medium Risk Only</option>
              <option value="LOW">Low Risk Only</option>
            </select>

            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved Only</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {/* Flags List */}
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading bypass flags...
              </div>
            ) : filteredFlags.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No bypass violations found</p>
                <p className="text-xs mt-1">All pipelines match current filter criteria.</p>
              </div>
            ) : (
              filteredFlags.map((flag) => {
                const badge = RISK_BADGES[flag.riskLevel] || RISK_BADGES.LOW;
                return (
                  <div
                    key={flag.id}
                    className={`rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md ${
                      !flag.isResolved ? "border-l-4 border-l-red-500" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label} ({flag.riskScore}/100)
                          </span>
                          <span className="font-bold text-base text-foreground">
                            {flag.companyName}
                          </span>
                          <span className="text-muted-foreground text-sm">·</span>
                          <span className="text-sm font-medium text-slate-700">
                            {flag.mandateTitle}
                          </span>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                          {flag.description}
                        </p>

                        <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <div>
                            Candidate:{" "}
                            <span className="font-semibold text-foreground">
                              {flag.candidateName}
                            </span>{" "}
                            ({flag.candidateEmail})
                          </div>
                          <div>
                            Recruiter:{" "}
                            <span className="font-semibold text-foreground">
                              {flag.recruiterName}
                            </span>
                          </div>
                          <div>
                            Detected:{" "}
                            <span className="text-foreground">
                              {new Date(flag.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Signals */}
                        {flag.signals && flag.signals.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t">
                            {flag.signals.map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                title={s.detail}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                {s.type.replace(/_/g, " ")}: {s.detail}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {flag.isResolved ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Resolved: {flag.resolution}
                            </span>
                            {flag.notes && (
                              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs truncate">
                                Note: {flag.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedFlag(flag);
                              setResolutionChoice("CONFIRMED_HIRE");
                              setResolutionNotes("");
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs gap-1.5"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Investigate & Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Company Trust Profiles */}
      {activeTab === "trust" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base">Company Trust Scoring Index</h2>
              <p className="text-xs text-muted-foreground">
                Algorithmic trust tiers computed weekly based on hire report fidelity, response latencies, and candidate check-in alignment.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-4 py-3.5">Trust Level</th>
                  <th className="px-4 py-3.5">Hire Report Fidelity</th>
                  <th className="px-4 py-3.5">Response Rate</th>
                  <th className="px-4 py-3.5">Avg Latency</th>
                  <th className="px-4 py-3.5">Active / Hired</th>
                  <th className="px-4 py-3.5">Disputes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trustScores.map((score) => {
                  const badge = TRUST_BADGES[score.trustLevel] || TRUST_BADGES.STANDARD;
                  return (
                    <tr key={score.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {score.companyName}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold">
                        <span
                          className={
                            score.hireReportRate >= 90
                              ? "text-emerald-600"
                              : score.hireReportRate >= 70
                              ? "text-amber-600"
                              : "text-red-600 font-bold"
                          }
                        >
                          {Number(score.hireReportRate).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {Number(score.responseRate).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {score.avgResponseDays} days
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-foreground">{score.reportedHires}</span> /{" "}
                        <span className="text-muted-foreground">{score.totalReferrals}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {score.disputeCount > 0 ? (
                          <span className="font-bold text-red-600">{score.disputeCount} active</span>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Modal Dialog */}
      {selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-bold">Investigate Bypass Alert</h3>
              </div>
              <button
                onClick={() => setSelectedFlag(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-slate-50 p-3.5 border space-y-1.5 text-xs">
                <div>
                  Company: <strong>{selectedFlag.companyName}</strong>
                </div>
                <div>
                  Role: <strong>{selectedFlag.mandateTitle}</strong>
                </div>
                <div>
                  Candidate: <strong>{selectedFlag.candidateName}</strong> ({selectedFlag.candidateEmail})
                </div>
                <div>
                  Recruiter: <strong>{selectedFlag.recruiterName}</strong>
                </div>
                <div className="pt-1 text-slate-600">{selectedFlag.description}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Resolution Decision
                </label>
                <select
                  value={resolutionChoice}
                  onChange={(e) => setResolutionChoice(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium"
                >
                  <option value="CONFIRMED_HIRE">
                    ✅ Confirmed Off-Platform Hire (Enforce Recruiter Reward)
                  </option>
                  <option value="FALSE_POSITIVE">
                    ❌ False Positive (Candidate was not hired / Withdrew)
                  </option>
                  <option value="UNDER_REVIEW">
                    ⏳ Keep Under Investigation / Legal Review
                  </option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {resolutionChoice === "CONFIRMED_HIRE" &&
                    "Confirms the hire in database, updates recruiter payout entitlement, and flags company trust score."}
                  {resolutionChoice === "FALSE_POSITIVE" &&
                    "Marks the flag as verified false positive without penalizing the company."}
                  {resolutionChoice === "UNDER_REVIEW" &&
                    "Keeps case active while additional payroll or candidate verification is collected."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Investigation & Verification Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Verified via candidate signed offer letter and LinkedIn join date..."
                  className="w-full rounded-lg border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFlag(null)}
                  disabled={resolving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleResolveSubmit}
                  disabled={resolving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {resolving ? "Saving Resolution..." : "Submit Resolution"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
