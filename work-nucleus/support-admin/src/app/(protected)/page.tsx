"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, ClipboardList, Ticket, AlertTriangle, TrendingUp, RefreshCw, Clock,
} from "lucide-react";
import Link from "next/link";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

interface DashboardData {
  totalOrgs: number;
  totalUsers: number;
  activeUsers: number;
  totalActivePlans: number;
  totalOpenTickets: number;
  orgsNeedingAttention: number;
  recentOrgs: { id: string; name: string; industry: string; createdAt: string }[];
}

export default function SupportDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboard = useCallback(() => {
    fetch("/api/support/dashboard")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.message || `Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((d) => { setData(d); setLastRefreshed(new Date()); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useAutoRefresh(fetchDashboard, 30_000, autoRefresh);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data.</p>;

  const kpis = [
    { label: "Total Organizations", value: data.totalOrgs, icon: Building2, color: "text-blue-600" },
    { label: "Active Users", value: `${data.activeUsers} / ${data.totalUsers}`, icon: Users, color: "text-green-600" },
    { label: "Active Hiring Plans", value: data.totalActivePlans, icon: ClipboardList, color: "text-purple-600" },
    { label: "Open Tickets", value: data.totalOpenTickets, icon: Ticket, color: "text-orange-600" },
    { label: "Needs Attention", value: data.orgsNeedingAttention, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Dashboard</h1>
          <p className="text-muted-foreground">Cross-organization overview and health monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="dashboard-toggle-refresh"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs font-medium transition-colors ${
              autoRefresh
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : "border-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            id="dashboard-refresh"
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {lastRefreshed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
          {autoRefresh && <span className="ml-1 text-emerald-500">(auto-refreshing every 30s)</span>}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/tickets/new"
              className="block rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Create New Ticket</p>
              <p className="text-sm text-muted-foreground">Log a new support issue for a client</p>
            </Link>
            <Link
              href="/organizations"
              className="block rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium">View Organizations</p>
              <p className="text-sm text-muted-foreground">Browse and inspect client organizations</p>
            </Link>
            <Link
              href="/metrics"
              className="block rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Support Metrics</p>
              <p className="text-sm text-muted-foreground">View SLA compliance and performance</p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recently Added Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.recentOrgs || []).map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.industry}</p>
                  </div>
                  <Badge variant="outline">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </Badge>
                </Link>
              ))}
              {(!data.recentOrgs || data.recentOrgs.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent organizations found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
