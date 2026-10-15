"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { Wallet, Calendar, ArrowRight } from "lucide-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

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

interface AppraisalCycle {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

export default function CompTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cycleIdParam = searchParams.get("cycleId") ?? "";
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>(cycleIdParam);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [rows, setRows] = useState<Revision[]>([]);
  const [edits, setEdits] = useState<Record<string, { hikeINR?: number; bonusINR?: number; reason: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Load available appraisal/compensation cycles
  useEffect(() => {
    async function fetchCycles() {
      setLoadingCycles(true);
      try {
        const res = await fetch("/api/v2/appraisal/cycles");
        if (res.ok) {
          const data: AppraisalCycle[] = await res.json();
          setCycles(data);
          if (!cycleIdParam && data.length > 0) {
            setActiveCycleId(data[0].id);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingCycles(false);
      }
    }
    fetchCycles();
  }, [cycleIdParam]);

  const loadRevisions = useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    try {
      const res = await fetch(`/api/v2/compensation/revisions?cycleId=${id}`);
      if (res.ok) setRows(await res.json());
      else setRows([]);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (activeCycleId) {
      loadRevisions(activeCycleId);
    }
  }, [activeCycleId, loadRevisions]);

  const handleCycleChange = (id: string) => {
    setActiveCycleId(id);
    router.replace(`/compensation/team?cycleId=${id}`);
  };

  async function saveOverride(r: Revision) {
    const e = edits[r.id];
    if (!e || !e.reason || e.reason.length < 5) {
      toast.error("Reason required (min 5 chars)");
      return;
    }
    setBusy(r.id);
    try {
      const res = await fetch(`/api/v2/compensation/revisions/${r.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(e.hikeINR !== undefined && { finalHikeINR: e.hikeINR }),
          ...(e.bonusINR !== undefined && { finalBonusINR: e.bonusINR }),
          overrideReason: e.reason,
        }),
      });
      if (!res.ok) throw new Error("Override failed");
      if (activeCycleId) await loadRevisions(activeCycleId);
      setEdits((prev) => {
        const n = { ...prev };
        delete n[r.id];
        return n;
      });
      toast.success("Override saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusy(null);
    }
  }

  const totalProposed = rows.reduce(
    (s, r) => s + Number(edits[r.id]?.hikeINR ?? r.finalHikeINR),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My team's compensation"
        subtitle={
          <>
            Override hike/bonus per report (with reason). Total proposed: ₹
            {totalProposed.toLocaleString("en-IN")}
          </>
        }
      />

      {cycles.length > 0 && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Compensation Cycle:</span>
          <select
            value={activeCycleId}
            onChange={(e) => handleCycleChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.status ? `(${c.status})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {!activeCycleId && !loadingCycles ? (
        <Card className="border-dashed border-slate-200/80 bg-slate-50/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No active compensation cycle</h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Compensation cycles allow organizations to calibrate salary hikes, bonuses, and equity revisions linked to performance appraisals.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button size="sm" onClick={() => router.push('/appraisal')}>
                View Appraisals
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/appraisal/cycles')}>
                Appraisal Cycles
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-slate-200/80 bg-slate-50/40">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-500">No revisions generated for this cycle yet.</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Employee</DataTableHead>
              <DataTableHead>Rating</DataTableHead>
              <DataTableHead>Current</DataTableHead>
              <DataTableHead>System hike</DataTableHead>
              <DataTableHead>Override hike (₹)</DataTableHead>
              <DataTableHead>Bonus (₹)</DataTableHead>
              <DataTableHead>Reason</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead></DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((r) => {
              const e = edits[r.id] ?? { reason: "" };
              return (
                <DataTableRow key={r.id}>
                  <DataTableCell className="font-medium text-slate-900">
                    {r.employee.name}
                  </DataTableCell>
                  <DataTableCell>{r.rating ?? "—"}</DataTableCell>
                  <DataTableCell>
                    ₹{Number(r.currentFixed).toLocaleString("en-IN")}
                  </DataTableCell>
                  <DataTableCell>
                    {Number(r.computedHikePct).toFixed(1)}% (₹
                    {Number(r.computedHikeINR).toLocaleString("en-IN")})
                  </DataTableCell>
                  <DataTableCell>
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
                  </DataTableCell>
                  <DataTableCell>
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
                  </DataTableCell>
                  <DataTableCell>
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
                  </DataTableCell>
                  <DataTableCell>
                    <Badge>{r.status}</Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      size="sm"
                      disabled={busy === r.id || !edits[r.id]}
                      onClick={() => saveOverride(r)}
                    >
                      Save
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
