"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
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
      await load();
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
    <div>
      <PageHeader
        title="My team's compensation"
        subtitle={
          <>
            Override hike/bonus per report (with reason). Total proposed: ₹
            {totalProposed.toLocaleString("en-IN")}
          </>
        }
      />

      {!cycleId ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            Append <code>?cycleId=&lt;uuid&gt;</code> to view revisions for a
            specific cycle.
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-slate-500">
            No revisions for this cycle yet.
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
