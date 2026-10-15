"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  IndianRupee,
  Users,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  MapPin,
  ShieldAlert,
  Download,
  Calendar,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";

interface CostByType {
  type: string;
  paise: number;
}

interface CostReportData {
  currency: string;
  totalPaise: number;
  totalRupees: number;
  byType: CostByType[];
  candidatesCount: number;
}

const CHECK_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  IDENTITY: {
    label: "Identity & Aadhaar/PAN",
    icon: ShieldCheck,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  EMPLOYMENT: {
    label: "Employment History",
    icon: Briefcase,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  EDUCATION: {
    label: "Education Verification",
    icon: GraduationCap,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  ADDRESS: {
    label: "Address Verification",
    icon: MapPin,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  CRIMINAL: {
    label: "Criminal & Court Records",
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  GLOBAL_DATABASE: {
    label: "Global Watchlist / Sanctions",
    icon: ShieldCheck,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
  },
};

function formatCurrency(amountRupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountRupees);
}

export default function BgvCostReportPage() {
  const [data, setData] = useState<CostReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"all" | "30d" | "90d" | "365d">("all");

  useEffect(() => {
    async function fetchCost() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (timeRange !== "all") {
          const now = new Date();
          const days = timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
          const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          params.set("from", from.toISOString());
        }

        const res = await fetch(`/api/v2/bgv/cost-report?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          // If no checks completed yet, set fallback zero state
          setData({
            currency: "INR",
            totalPaise: 0,
            totalRupees: 0,
            byType: [],
            candidatesCount: 0,
          });
        }
      } catch {
        setData({
          currency: "INR",
          totalPaise: 0,
          totalRupees: 0,
          byType: [],
          candidatesCount: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchCost();
  }, [timeRange]);

  const totalSpend = data?.totalRupees ?? 0;
  const candidatesCount = data?.candidatesCount ?? 0;
  const avgCostPerCandidate =
    candidatesCount > 0 ? Math.round(totalSpend / candidatesCount) : 0;

  const totalChecks = useMemo(() => {
    if (!data?.byType) return 0;
    return data.byType.length;
  }, [data]);

  const exportCsv = () => {
    if (!data?.byType.length) return;
    const rows = [
      ["Check Type", "Cost (INR)", "% of Total"],
      ...data.byType.map((item) => {
        const rupees = item.paise / 100;
        const pct = totalSpend > 0 ? ((rupees / totalSpend) * 100).toFixed(1) : "0";
        return [item.type, String(rupees), `${pct}%`];
      }),
    ];
    const csvContent = rows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bgv_cost_report_${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Back button and page header */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link
          href="/bgv"
          className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to BGV Tracker
        </Link>
      </div>

      <PageHeader
        title="Background Verification Spend & Cost Report"
        subtitle="Detailed breakdown of vendor verification costs, package usage, and per-candidate expenses."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!data?.byType.length}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Link href="/company/financials">
              <Button size="sm" variant="default" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                <Wallet className="h-4 w-4" />
                Manage Escrow
              </Button>
            </Link>
          </div>
        }
      />

      {/* Date filter pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> Period:
        </span>
        {[
          { key: "all", label: "All Time" },
          { key: "30d", label: "Last 30 Days" },
          { key: "90d", label: "Last 90 Days" },
          { key: "365d", label: "This Year" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTimeRange(t.key as any)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              timeRange === t.key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total BGV Spend
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(totalSpend)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Direct vendor verifications
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Candidates Screened
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {candidatesCount}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    With completed checks
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Avg Cost / Candidate
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(avgCostPerCandidate)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Across all check packages
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Active Check Types
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {totalChecks}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Integrated vendor checks
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Briefcase className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">
                  Cost Breakdown by Check Type
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {data?.currency || "INR"}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {!data?.byType || data.byType.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                    <ShieldCheck className="h-12 w-12 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No BGV check costs recorded</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Costs will automatically populate as background verification checks complete.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {data.byType.map((item) => {
                      const rupees = item.paise / 100;
                      const pct =
                        totalSpend > 0 ? Math.round((rupees / totalSpend) * 100) : 0;
                      const meta = CHECK_TYPE_META[item.type] || {
                        label: item.type.replace(/_/g, " "),
                        icon: ShieldCheck,
                        color: "text-slate-600",
                        bg: "bg-slate-50 border-slate-200",
                      };
                      const Icon = meta.icon;

                      return (
                        <div key={item.type} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`h-8 w-8 rounded-lg flex items-center justify-center border ${meta.bg} ${meta.color}`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {meta.label}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {item.type}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(rupees)}
                              </p>
                              <p className="text-xs text-slate-400">{pct}% of total</p>
                            </div>
                          </div>
                          <Progress value={pct} max={100} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right side info & actions */}
            <div className="space-y-6">
              <Card className="border-slate-200 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Verification Packages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600">
                  <p>
                    Background verification checks are orchestrated via OnGrid and IDfy. Charges are deducted directly from your verified company escrow balance.
                  </p>
                  <div className="rounded-lg border border-indigo-100 bg-white p-3 space-y-1.5">
                    <p className="font-semibold text-indigo-900">Standard Package Includes:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      <li>Identity & ID Documents (Aadhaar, PAN)</li>
                      <li>Employment History (Last 2 employers)</li>
                      <li>Highest Degree Education Verification</li>
                      <li>Address Verification (Current & Permanent)</li>
                    </ul>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Link href="/bgv">
                      <Button variant="outline" size="sm" className="w-full">
                        Initiate Checks on BGV Page
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
