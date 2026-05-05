"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, IndianRupee } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

interface BgvRow {
  id: string;
  status: string;
  vendor: string;
  riskScore: string | null;
  candidate: { id: string; name: string; email: string };
  checks: Array<{ id: string; type: string; status: string; finding: string; costInPaise: number | null }>;
  createdAt: string;
}

const bgvStatusVariant: Record<string, BadgeProps["variant"]> = {
  NOT_STARTED: "secondary",
  CONSENT_PENDING: "warning",
  IN_PROGRESS: "info",
  NEEDS_REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "secondary",
};

const riskVariant: Record<string, BadgeProps["variant"]> = {
  GREEN: "success",
  AMBER: "warning",
  RED: "destructive",
};

const FILTER_OPTIONS = [
  "",
  "CONSENT_PENDING",
  "IN_PROGRESS",
  "NEEDS_REVIEW",
  "COMPLETED",
  "CANCELLED",
];

export default function BgvListPage() {
  const [rows, setRows] = useState<BgvRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/v2/bgv${qs}`)
      .then((r) => r.json())
      .then((j) => setRows(Array.isArray(j) ? j : []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <PageHeader
        title="Background Verification"
        subtitle="DPDP-compliant orchestration across vendors and check types."
        actions={
          <Link href="/bgv/cost">
            <Button variant="outline" size="sm">
              <IndianRupee className="h-4 w-4" /> Cost report
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((s) => (
          <Button
            key={s || "all"}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s.replace(/_/g, " ") || "All"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="No BGV profiles"
          description="Initiate one from the candidate detail page."
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Candidate</DataTableHead>
              <DataTableHead>Vendor</DataTableHead>
              <DataTableHead>Checks</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Risk</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((r) => (
              <DataTableRow key={r.id}>
                <DataTableCell>
                  <Link
                    href={`/bgv/${r.id}`}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {r.candidate.name}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {r.candidate.email}
                  </div>
                </DataTableCell>
                <DataTableCell>{r.vendor}</DataTableCell>
                <DataTableCell>{r.checks.length}</DataTableCell>
                <DataTableCell>
                  <Badge variant={bgvStatusVariant[r.status] ?? "outline"}>
                    {r.status.replace(/_/g, " ")}
                  </Badge>
                </DataTableCell>
                <DataTableCell>
                  {r.riskScore ? (
                    <Badge variant={riskVariant[r.riskScore] ?? "outline"}>
                      {r.riskScore}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
