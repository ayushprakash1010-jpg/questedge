"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Cycle {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  goalSettingDeadline: string;
  selfAssessmentDeadline: string;
  managerReviewDeadline: string;
  calibrationDeadline: string;
}

export default function AdminAppraisalCyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/v2/appraisal/cycles");
    if (res.ok) setCycles(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function advance(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/appraisal/cycles/${id}/advance`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.message ?? "Could not advance");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Appraisal cycles</h1>
          <p className="text-sm text-slate-500">Configure cycles, advance stages, and oversee calibration sessions.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{cycles.length} cycles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Range</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.type}</td>
                  <td className="px-4 py-3">
                    <Badge>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => advance(c.id)} disabled={busy}>
                      Advance stage
                    </Button>
                    <Link href={`/admin/appraisal/cycles/${c.id}`}>
                      <Button size="sm" variant="outline">Open</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {cycles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No cycles yet. Create one via POST /api/v2/appraisal/cycles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
