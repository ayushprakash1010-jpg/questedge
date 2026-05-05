"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Sparkles, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";

interface Budget {
  id: string;
  status: string;
  hikePoolINR: string;
  bonusPoolINR: string;
  matrix: Record<string, number>;
  bonusMatrix: Record<string, number>;
  hikeCapPct: string;
}

interface Variance {
  budget: { hikePoolINR: number; bonusPoolINR: number };
  totals: { computedHike: number; finalHike: number; computedBonus: number; finalBonus: number };
  conformancePct: number;
  distributionByRating: Record<string, number>;
  annualisedWageBillIncrease: number;
}

const RATINGS = [5, 4, 3, 2, 1];

export default function CompCyclePage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [variance, setVariance] = useState<Variance | null>(null);
  const [hikePool, setHikePool] = useState<number | "">("");
  const [bonusPool, setBonusPool] = useState<number | "">("");
  const [matrix, setMatrix] = useState<Record<string, number>>({ "5": 15, "4": 10, "3": 6, "2": 2, "1": 0 });
  const [bonusMatrix, setBonusMatrix] = useState<Record<string, number>>({ "5": 2, "4": 1, "3": 0.5, "2": 0, "1": 0 });
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/v2/compensation/budgets?cycleId=${cycleId}`);
    if (res.ok) {
      const b = await res.json();
      setBudget(b);
      setHikePool(Number(b.hikePoolINR));
      setBonusPool(Number(b.bonusPoolINR));
      setMatrix(b.matrix);
      setBonusMatrix(b.bonusMatrix);
    }
    const v = await fetch(`/api/v2/compensation/revisions/cycles/${cycleId}/variance`);
    if (v.ok) setVariance(await v.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  async function saveBudget() {
    setBusy(true);
    try {
      const body = {
        cycleId,
        hikePoolINR: Number(hikePool),
        bonusPoolINR: Number(bonusPool),
        matrix,
        bonusMatrix,
      };
      const url = budget
        ? `/api/v2/compensation/budgets/${budget.id}`
        : `/api/v2/compensation/budgets`;
      const res = await fetch(url, {
        method: budget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Save failed");
      }
      await load();
      toast.success(budget ? "Budget updated" : "Budget created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function allocate() {
    if (!window.confirm("Run allocator? This writes one revision per finalised assessment.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/compensation/revisions/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Allocator failed");
      }
      await load();
      toast.success("Allocator complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Allocator failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Compensation cycle"
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{cycleId}</span>
            {budget && <Badge>{budget.status}</Badge>}
          </span>
        }
        actions={
          <>
            <Link href={`/admin/compensation/cycles/${cycleId}/simulator`}>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4" /> Simulator
              </Button>
            </Link>
            <Button size="sm" onClick={allocate} disabled={busy || !budget}>
              Run allocator
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Budget setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hike-pool">Hike pool (₹)</Label>
              <Input
                id="hike-pool"
                type="number"
                value={hikePool}
                onChange={(e) => setHikePool(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bonus-pool">Bonus pool (₹)</Label>
              <Input
                id="bonus-pool"
                type="number"
                value={bonusPool}
                onChange={(e) => setBonusPool(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Rating → hike %</Label>
            <div className="grid grid-cols-5 gap-2">
              {RATINGS.map((r) => (
                <div key={r}>
                  <p className="text-xs text-slate-500">{r}</p>
                  <Input
                    type="number"
                    value={matrix[String(r)] ?? 0}
                    onChange={(e) =>
                      setMatrix({ ...matrix, [String(r)]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Rating → bonus months</Label>
            <div className="grid grid-cols-5 gap-2">
              {RATINGS.map((r) => (
                <div key={r}>
                  <p className="text-xs text-slate-500">{r}</p>
                  <Input
                    type="number"
                    step="0.5"
                    value={bonusMatrix[String(r)] ?? 0}
                    onChange={(e) =>
                      setBonusMatrix({
                        ...bonusMatrix,
                        [String(r)]: Number(e.target.value),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <Button onClick={saveBudget} disabled={busy}>
            <Save className="h-4 w-4" />{" "}
            {budget ? "Save changes" : "Create budget"}
          </Button>
        </CardContent>
      </Card>

      {variance && (
        <Card>
          <CardHeader>
            <CardTitle>Variance &amp; conformance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Hike: planned vs final
              </p>
              <p className="mt-1 text-slate-700">
                ₹{variance.totals.computedHike.toLocaleString("en-IN")} → ₹
                {variance.totals.finalHike.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bonus: planned vs final
              </p>
              <p className="mt-1 text-slate-700">
                ₹{variance.totals.computedBonus.toLocaleString("en-IN")} → ₹
                {variance.totals.finalBonus.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Matrix conformance
              </p>
              <p className="mt-1 text-slate-700">
                {variance.conformancePct.toFixed(1)}% of revisions within ±0.5%
                of matrix
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Annualised wage-bill increase
              </p>
              <p className="mt-1 text-slate-700">
                ₹{variance.annualisedWageBillIncrease.toLocaleString("en-IN")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
