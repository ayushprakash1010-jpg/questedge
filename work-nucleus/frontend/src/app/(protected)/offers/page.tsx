"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Receipt } from "lucide-react";
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

interface OfferRow {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  application: { candidate: { id: string; name: string; email: string } };
  template: { id: string; name: string };
  compensation: { fixedAnnual: string; currency: string } | null;
}

const offerStatusVariant: Record<string, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  SENT: "default",
  VIEWED: "default",
  ACCEPTED: "success",
  DECLINED: "destructive",
  REVOKED: "secondary",
  EXPIRED: "secondary",
};

const FILTER_OPTIONS = [
  "",
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
  "DECLINED",
];

export default function OffersListPage() {
  const [data, setData] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/v2/offers${qs}`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <PageHeader
        title="Offers"
        subtitle="Generate, approve, and track offer letters end-to-end."
        actions={
          <Link href="/offers/templates">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" /> Templates
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
            {s.replace("_", " ") || "All"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-14 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No offers yet"
          description="Create one from a SELECTED candidate's decision page."
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Candidate</DataTableHead>
              <DataTableHead>Template</DataTableHead>
              <DataTableHead>Compensation</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Created</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {data.map((o) => (
              <DataTableRow key={o.id}>
                <DataTableCell>
                  <Link
                    href={`/offers/${o.id}`}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {o.application.candidate.name}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {o.application.candidate.email}
                  </div>
                </DataTableCell>
                <DataTableCell>{o.template.name}</DataTableCell>
                <DataTableCell>
                  {o.compensation
                    ? `${o.compensation.currency} ${Number(o.compensation.fixedAnnual).toLocaleString("en-IN")}`
                    : "—"}
                </DataTableCell>
                <DataTableCell>
                  <Badge variant={offerStatusVariant[o.status] ?? "outline"}>
                    {o.status.replace("_", " ")}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="text-xs text-slate-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
