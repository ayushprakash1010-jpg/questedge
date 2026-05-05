"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Revision {
  id: string;
  status: string;
  rating: string | null;
  currentFixed: string;
  computedHikePct: string;
  computedHikeINR: string;
  finalHikePct: string;
  finalHikeINR: string;
  finalBonusINR: string;
  newFixed: string;
  overrideReason: string | null;
  employee: { id: string; name: string; email: string };
}

export default function CompTeamPage() {
  const searchParams = useSearchParams();
  const cycleId = searchParams.get("cycleId") ?? "";
  const [rows, setRows] = useState<Revision[]>([]);
  const [edits, setEdits] = useState<Record<string, { hikeINR?: number; bonusINR?: number; reason: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!cycleId) return;
    const res = await fetch(`/api/v2/compensation/revisions?cycleId=${cycleId}`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  async function saveOverride(r: Revision) {
    const e = edits[r.id];
    if (!e || !e.reason || e.reason.length < 5) {
      alert("Reason required (min 5 chars)");
      return;
    }
    setBusy(r.id);
    try {
      await fetch(`/api/v2/compensation/revisions/${r.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(e.hikeINR !== undefined && { finalHikeINR: e.hikeINR }),
          ...(e.bonusINR !== undefined && { finalBonusINR: e.bonusINR }),
          overrideReason: e.reason,
        }),
      });
      await load();
      setEdits((prev) => {
        const n = { ...prev };
        delete n[r.id];
        return n;
      });
    } finally {
      setBusy(null);
    }
  }

  const totalProposed = rows.reduce((s, r) => s + Number(edits[r.id]?.hikeINR ?? r.finalHikeINR), 0);

  return (
    <div className="p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">My team's compensation</h1>
        <p className="text-sm text-slate-500">
          Override hike/bonus per report (with reason). Total proposed: ₹{totalProposed.toLocaleString("en-IN")}
        </p>
      </header>

      {!cycleId && (
        <Card>
          <CardContent className="p-6 text-slate-500">
            Append <code>?cycleId=&lt;uuid&gt;</code> to view revisions for a specific cycle.
          </CardContent>
        </Card>
      )}

      {cycleId && (
        <Card>
          <CardHeader>
            <CardTitle>{rows.length} reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Current</th>
                  <th className="px-3 py-2">System hike</th>
                  <th className="px-3 py-2">Override hike (₹)</th>
                  <th className="px-3 py-2">Bonus (₹)</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const e = edits[r.id] ?? { reason: "" };
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.employee.name}</td>
                      <td className="px-3 py-2">{r.rating ?? "—"}</td>
                      <td className="px-3 py-2">₹{Number(r.currentFixed).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">
                        {Number(r.computedHikePct).toFixed(1)}% (₹
                        {Number(r.computedHikeINR).toLocaleString("en-IN")})
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          className="w-24"
                          defaultValue={Number(r.finalHikeINR)}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...e, hikeINR: Number(ev.target.value) },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          className="w-24"
                          defaultValue={Number(r.finalBonusINR)}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...e, bonusINR: Number(ev.target.value) },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          placeholder="Why this change?"
                          value={e.reason}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...e, reason: ev.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Badge>{r.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button size="sm" disabled={busy === r.id || !edits[r.id]} onClick={() => saveOverride(r)}>
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                      No revisions for this cycle yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
