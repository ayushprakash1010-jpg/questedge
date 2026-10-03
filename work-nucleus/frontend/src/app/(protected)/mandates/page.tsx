"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getOrgMandates, publishMandate, pauseMandate, deleteMandate, Mandate } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0/client";

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Status filter pill ───────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Paused", value: "PAUSED" },
  { label: "Filled", value: "FILLED" },
  { label: "Closed", value: "CLOSED" },
];

// ── Page ─────────────────────────────────────────────────────────

export default function MandatesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchMandates = useCallback(async () => {
    try {
      setLoading(true);
      // Get token from Auth0 session
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const result = await getOrgMandates(accessToken, {
        q: searchQuery || undefined,
        status: (statusFilter as any) || undefined,
      });
      setMandates(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      console.error("Failed to load mandates", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  // Computed stats
  const activeCount = mandates.filter((m) => m.status === "ACTIVE").length;
  const totalReferrals = mandates.reduce((acc, m) => acc + (m._count?.referrals ?? 0), 0);
  const totalApplications = mandates.reduce((acc, m) => acc + (m._count?.applications ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mandates</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your job postings and track referrals
            </p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
            onClick={() => router.push("/mandates/create")}
          >
            <Plus className="h-4 w-4" />
            New Mandate
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Mandates"
            value={activeCount}
            icon={TrendingUp}
            color="bg-indigo-500"
            sub={`of ${total} total`}
          />
          <StatCard
            label="Total Referrals"
            value={totalReferrals}
            icon={Users}
            color="bg-sky-500"
          />
          <StatCard
            label="Direct Applications"
            value={totalApplications}
            icon={FileText}
            color="bg-violet-500"
          />
          <StatCard
            label="Positions Filled"
            value={mandates.filter((m) => m.status === "FILLED").length}
            icon={CheckCircle2}
            color="bg-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 bg-white border-slate-200"
              placeholder="Search mandates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  statusFilter === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mandate grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : mandates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-indigo-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No mandates yet</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Create your first mandate to start receiving referrals from top recruiters.
            </p>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              onClick={() => router.push("/mandates/create")}
            >
              <Plus className="h-4 w-4" />
              Create First Mandate
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mandates.map((mandate) => (
              <MandateCard
                key={mandate.id}
                {...mandate}
                recruiterCount={mandate._count?.participations}
                referralCount={mandate._count?.referrals}
                viewAs="company"
                onClick={(id) => router.push(`/mandates/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
