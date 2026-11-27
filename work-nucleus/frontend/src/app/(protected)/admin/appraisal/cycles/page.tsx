"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/v2/appraisal/cycles");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Failed to load appraisal cycles");
      }
      setCycles(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appraisal cycles");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function advance(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/appraisal/cycles/${id}/advance`, {
        method: "POST",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Could not advance");
      }
      await load();
      toast.success("Stage advanced");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not advance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Appraisal cycles"
        subtitle="Configure cycles, advance stages, and oversee calibration sessions."
        actions={
          <Link href="/appraisal/cycles/new">
            <Button size="sm">New Cycle</Button>
          </Link>
        }
      />
      {error && (
        <Card className="mb-4 border-rose-200 bg-rose-50/50">
          <CardContent className="flex items-center justify-between py-3 text-sm text-rose-700">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{cycles.length} cycles</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {cycles.length === 0 ? (
            <p className="px-5 pb-5 text-center text-sm text-slate-500">
              No cycles yet. Create one via POST /api/v2/appraisal/cycles.
            </p>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Type</DataTableHead>
                  <DataTableHead>Stage</DataTableHead>
                  <DataTableHead>Range</DataTableHead>
                  <DataTableHead>Actions</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {cycles.map((c) => (
                  <DataTableRow key={c.id}>
                    <DataTableCell className="font-medium text-slate-900">
                      {c.name}
                    </DataTableCell>
                    <DataTableCell>{c.type}</DataTableCell>
                    <DataTableCell>
                      <Badge>{c.status}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-xs text-slate-500">
                      {new Date(c.startDate).toLocaleDateString()} –{" "}
                      {new Date(c.endDate).toLocaleDateString()}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => advance(c.id)}
                          disabled={busy}
                        >
                          Advance stage
                        </Button>
                        <Link href={`/admin/appraisal/cycles/${c.id}`}>
                          <Button size="sm" variant="outline">
                            Open
                          </Button>
                        </Link>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
