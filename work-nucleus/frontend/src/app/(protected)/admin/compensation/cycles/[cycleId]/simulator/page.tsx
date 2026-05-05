"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

interface AllocResult {
  results: Array<{
    employeeId: string;
    computedHikePct: number;
    computedHikeINR: number;
    computedBonusINR: number;
    newFixed: number;
  }>;
  totalHikeAllocated: number;
  totalBonusAllocated: number;
  totalHikeBudget: number;
  totalBonusBudget: number;
  overruns: Array<{ scopeKey: string; budget: number; pre: number; post: number }>;
  underspend: { hikeINR: number; bonusINR: number };
}

interface SimulateBody {
  cycleId: string;
  overrideMatrix?: Record<string, number>;
  overridePools?: { hikePoolINR: number };
}

const RATINGS = [5, 4, 3, 2, 1];

export default function SimulatorPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [result, setResult] = useState<AllocResult | null>(null);
  const [hikePool, setHikePool] = useState<number | "">("");
  const [matrix, setMatrix] = useState<Record<string, number>>({
    "5": 15, "4": 10, "3": 6, "2": 2, "1": 0,
  });
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function simulate(opts?: { useOverrides: boolean }) {
    const t0 = performance.now();
    const body: SimulateBody = { cycleId };
    if (opts?.useOverrides) {
      body.overrideMatrix = matrix;
      if (typeof hikePool === "number") body.overridePools = { hikePoolINR: hikePool };
    }
    const res = await fetch(`/api/v2/compensation/revisions/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setResult(await res.json());
      setLatencyMs(Math.round(performance.now() - t0));
    }
  }

  useEffect(() => {
    simulate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  const distribution: Record<string, number> = {};
  if (result) {
    for (const r of result.results) {
      const k = String(Math.round(r.computedHikePct / 5) * 5);
      distribution[k] = (distribution[k] ?? 0) + 1;
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="What-if simulator"
        subtitle={
          <>
            Tune pool, matrix, and ratings — recompute happens server-side
            without persistence.
            {latencyMs !== null && (
              <span className="ml-2 text-slate-400">
                Last recompute: {latencyMs}ms
              </span>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pool override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="hike-pool-override">Hike pool (₹)</Label>
            <Input
              id="hike-pool-override"
              type="number"
              placeholder="Use cycle default"
              value={hikePool}
              onChange={(e) =>
                setHikePool(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
            <Button
              className="mt-3 w-full"
              onClick={() => simulate({ useOverrides: true })}
            >
              Recompute
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rating matrix (% hike)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-2">
            {RATINGS.map((r) => (
              <div key={r} className="space-y-1.5">
                <Label htmlFor={`mtx-${r}`}>Rating {r}</Label>
                <Input
                  id={`mtx-${r}`}
                  type="number"
                  value={matrix[String(r)] ?? 0}
                  onChange={(e) =>
                    setMatrix({ ...matrix, [String(r)]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {result && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Hike allocated"
              value={`₹${result.totalHikeAllocated.toLocaleString("en-IN")} / ₹${result.totalHikeBudget.toLocaleString("en-IN")}`}
            />
            <Stat
              label="Bonus allocated"
              value={`₹${result.totalBonusAllocated.toLocaleString("en-IN")} / ₹${result.totalBonusBudget.toLocaleString("en-IN")}`}
            />
            <Stat
              label="Underspend"
              value={`₹${result.underspend.hikeINR.toLocaleString("en-IN")}`}
            />
          </div>

          {result.overruns.length > 0 && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle />
              <AlertTitle>Trim applied</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 text-xs">
                  {result.overruns.map((o) => (
                    <div key={o.scopeKey}>
                      {o.scopeKey}: pre ₹{o.pre.toLocaleString("en-IN")} → post ₹
                      {o.post.toLocaleString("en-IN")} (budget ₹
                      {o.budget.toLocaleString("en-IN")})
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Hike % distribution (binned by 5%)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-6 gap-2">
              {Object.entries(distribution)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-md border border-slate-200/60 p-2 text-center"
                  >
                    <p className="text-xs text-slate-500">{k}%</p>
                    <p className="text-lg font-bold text-slate-900">{v}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
