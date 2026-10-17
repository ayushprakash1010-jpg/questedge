"use client";

import { useEffect, useState } from "react";
import { HeartPulse, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";

interface HealthStatus {
  status: string;
  db?: string;
  redis?: string;
  storage?: string;
  timestamp?: string;
}

function StatusIcon({ status }: { status?: string }) {
  if (!status || status === "ok" || status === "up")
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "degraded")
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? "unknown";
  if (s === "ok" || s === "up" || s === "healthy")
    return <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">Healthy</span>;
  if (s === "degraded")
    return <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">Degraded</span>;
  if (s === "down" || s === "error")
    return <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-600">Down</span>;
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">{status ?? "Unknown"}</span>;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchHealth(); }, []);

  async function fetchHealth() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/support/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth(await res.json());
      setLastChecked(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const services = health
    ? [
        { name: "API Server", status: health.status, description: "Backend NestJS application" },
        { name: "Database", status: health.db ?? health.status, description: "PostgreSQL via Neon" },
        { name: "Cache", status: health.redis ?? "unknown", description: "Redis via Upstash" },
        { name: "Storage", status: health.storage ?? "unknown", description: "S3-compatible object storage" },
      ]
    : [];

  const overallOk = services.length > 0 && services.every((s) => ["ok", "up", "healthy"].includes(s.status?.toLowerCase() ?? ""));
  const overallDegraded = services.some((s) => s.status?.toLowerCase() === "degraded");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
            <p className="text-sm text-muted-foreground">Real-time service status</p>
          </div>
        </div>
        <button
          id="refresh-health"
          onClick={fetchHealth}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
        >
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {lastChecked && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Health check failed</p>
            <p className="text-xs mt-0.5">{error} — The backend may be unreachable.</p>
          </div>
        </div>
      )}

      {/* Overall Banner */}
      {!loading && !error && (
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${
          overallOk ? "border-green-200 bg-green-50" : overallDegraded ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"
        }`}>
          {overallOk ? <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            : overallDegraded ? <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
            : <XCircle className="h-8 w-8 text-red-500 shrink-0" />}
          <div>
            <p className={`text-lg font-bold ${overallOk ? "text-green-800" : overallDegraded ? "text-amber-800" : "text-red-800"}`}>
              {overallOk ? "All Systems Operational" : overallDegraded ? "Partial Degradation" : "System Issues Detected"}
            </p>
            <p className="text-sm text-muted-foreground">
              {overallOk ? "All services are running normally." : "One or more services may be experiencing issues."}
            </p>
          </div>
        </div>
      )}

      {/* Service Cards */}
      {!loading && services.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((svc) => (
            <div key={svc.name} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <StatusIcon status={svc.status} />
                <StatusBadge status={svc.status} />
              </div>
              <p className="font-semibold text-sm">{svc.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-sm animate-pulse">
              <div className="h-5 w-5 rounded-full bg-muted mb-3" />
              <div className="h-3 w-24 rounded bg-muted mb-1.5" />
              <div className="h-2.5 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
