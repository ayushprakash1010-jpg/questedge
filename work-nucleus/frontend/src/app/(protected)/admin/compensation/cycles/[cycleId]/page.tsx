"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save } from "lucide-react";

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
      const url = budget ? `/api/v2/compensation/budgets/${budget.id}` : `/api/v2/compensation/budgets`;
      const res = await fetch(url, {
        method: budget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.message ?? "Save failed");
      }
      await load();
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
        alert(e.message ?? "Allocator failed");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compensation cycle</h1>
          <p className="text-sm text-slate-500">{cycleId}</p>
          {budget && <Badge className="mt-2">{budget.status}</Badge>}
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/compensation/cycles/${cycleId}/simulator`}>
            <Button variant="outline">
              <Sparkles className="w-4 h-4 mr-1" /> Simulator
            </Button>
          </Link>
          <Button onClick={allocate} disabled={busy || !budget}>
            Run allocator
          </Button>
        </div>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Budget setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Hike pool (₹)</label>
              <Input type="number" value={hikePool} onChange={(e) => setHikePool(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Bonus pool (₹)</label>
              <Input type="number" value={bonusPool} onChange={(e) => setBonusPool(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Rating → hike %</label>
            <div className="grid grid-cols-5 gap-2">
              {RATINGS.map((r) => (
                <div key={r}>
                  <p className="text-xs">{r}</p>
                  <Input
                    type="number"
                    value={matrix[String(r)] ?? 0}
                    onChange={(e) => setMatrix({ ...matrix, [String(r)]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Rating → bonus months</label>
            <div className="grid grid-cols-5 gap-2">
              {RATINGS.map((r) => (
                <div key={r}>
                  <p className="text-xs">{r}</p>
                  <Input
                    type="number"
                    step="0.5"
                    value={bonusMatrix[String(r)] ?? 0}
                    onChange={(e) => setBonusMatrix({ ...bonusMatrix, [String(r)]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>
          <Button onClick={saveBudget} disabled={busy}>
            <Save className="w-4 h-4 mr-1" /> {budget ? "Save changes" : "Create budget"}
          </Button>
        </CardContent>
      </Card>

      {variance && (
        <Card>
          <CardHeader>
            <CardTitle>Variance &amp; conformance</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Hike: planned vs final</p>
              <p>
                ₹{variance.totals.computedHike.toLocaleString("en-IN")} → ₹
                {variance.totals.finalHike.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Bonus: planned vs final</p>
              <p>
                ₹{variance.totals.computedBonus.toLocaleString("en-IN")} → ₹
                {variance.totals.finalBonus.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Matrix conformance</p>
              <p>{variance.conformancePct.toFixed(1)}% of revisions within ±0.5% of matrix</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Annualised wage-bill increase</p>
              <p>₹{variance.annualisedWageBillIncrease.toLocaleString("en-IN")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
