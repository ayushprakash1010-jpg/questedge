"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { readResponseError } from "@/lib/api";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/shared/data-table";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionInput, setActionInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setActionFilter(actionInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [actionInput]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (entityTypeFilter) params.set("entityType", entityTypeFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load audit log"));
      }
      const data = await res.json();
      setEntries(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter, fromDate, toDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Track all system activity and changes."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by action..."
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          className="w-48"
        />
        <Select
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All Entities</option>
          <option value="USER">User</option>
          <option value="ORG_SETTINGS">Org Settings</option>
          <option value="MANDATE">Mandate</option>
          <option value="OFFER">Offer</option>
          <option value="OFFER_APPROVAL">Offer Approval</option>
          <option value="BGV_PROFILE">BGV Profile</option>
          <option value="BGV_CHECK">BGV Check</option>
          <option value="APPRAISAL_CYCLE">Appraisal Cycle</option>
          <option value="GOAL">Goal</option>
          <option value="COMP_REVISION">Comp Revision</option>
          <option value="TRAINING_MODULE">Training</option>
          <option value="REPORT_DEFINITION">Report Definition</option>
          <option value="REWARD_TRACKING">Reward Dispute</option>
          <option value="REWARD">Reward</option>
        </Select>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          className="w-40"
          title="From date"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          className="w-40"
          title="To date"
        />
        <span className="text-xs text-slate-400">{total} entries</span>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadEntries}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          title="No audit entries"
          description="Activity will appear here as users interact with the system."
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Time</DataTableHead>
              <DataTableHead>User</DataTableHead>
              <DataTableHead>Action</DataTableHead>
              <DataTableHead>Entity</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {entries.map((e) => (
              <DataTableRow key={e.id}>
                <DataTableCell className="text-xs text-slate-500">
                  {new Date(e.createdAt).toLocaleString()}
                </DataTableCell>
                <DataTableCell>{e.user.name}</DataTableCell>
                <DataTableCell>
                  <Badge variant="outline">{e.action}</Badge>
                </DataTableCell>
                <DataTableCell className="text-xs text-slate-500">
                  {e.entityType}
                  {e.entityId ? ` (${e.entityId.slice(0, 8)}...)` : ""}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
          {total > PAGE_SIZE && (
            <tfoot>
              <tr>
                <td colSpan={4} className="p-0">
                  <DataTablePagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onPageChange={(p) => setPage(p)}
                  />
                </td>
              </tr>
            </tfoot>
          )}
        </DataTable>
      )}
    </div>
  );
}
