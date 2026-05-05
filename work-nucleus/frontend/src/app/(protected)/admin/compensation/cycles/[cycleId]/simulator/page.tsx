"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const RATINGS = [5, 4, 3, 2, 1];

export default function SimulatorPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [result, setResult] = useState<AllocResult | null>(null);
  const [hikePool, setHikePool] = useState<number | "">("");
  const [matrix, setMatrix] = useState<Record<string, number>>({ "5": 15, "4": 10, "3": 6, "2": 2, "1": 0 });
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function simulate(opts?: { useOverrides: boolean }) {
    const t0 = performance.now();
    const body: any = { cycleId };
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
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">What-if simulator</h1>
        <p className="text-sm text-slate-500">
          Tune pool, matrix, and ratings — recompute happens server-side without persistence.
          {latencyMs !== null && <span className="ml-2">Last recompute: {latencyMs}ms</span>}
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pool override</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="text-xs text-slate-500">Hike pool (₹)</label>
            <Input
              type="number"
              placeholder="Use cycle default"
              value={hikePool}
              onChange={(e) => setHikePool(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <Button className="mt-3 w-full" onClick={() => simulate({ useOverrides: true })}>
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
              <div key={r}>
                <label className="text-xs text-slate-500">Rating {r}</label>
                <Input
                  type="number"
                  value={matrix[String(r)] ?? 0}
                  onChange={(e) => setMatrix({ ...matrix, [String(r)]: Number(e.target.value) })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {result && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <Stat label="Hike allocated" value={`₹${result.totalHikeAllocated.toLocaleString("en-IN")} / ₹${result.totalHikeBudget.toLocaleString("en-IN")}`} />
            <Stat label="Bonus allocated" value={`₹${result.totalBonusAllocated.toLocaleString("en-IN")} / ₹${result.totalBonusBudget.toLocaleString("en-IN")}`} />
            <Stat label="Underspend" value={`₹${result.underspend.hikeINR.toLocaleString("en-IN")}`} />
          </div>

          {result.overruns.length > 0 && (
            <Card className="mb-4 border-amber-300">
              <CardHeader>
                <CardTitle className="text-sm text-amber-700">Trim applied</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                {result.overruns.map((o) => (
                  <div key={o.scopeKey}>
                    {o.scopeKey}: pre ₹{o.pre.toLocaleString("en-IN")} → post ₹{o.post.toLocaleString("en-IN")} (budget ₹
                    {o.budget.toLocaleString("en-IN")})
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Hike % distribution (binned by 5%)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-6 gap-2">
              {Object.entries(distribution)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([k, v]) => (
                  <div key={k} className="border rounded-md p-2 text-center">
                    <p className="text-xs text-slate-500">{k}%</p>
                    <p className="text-lg font-semibold">{v}</p>
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
        <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
