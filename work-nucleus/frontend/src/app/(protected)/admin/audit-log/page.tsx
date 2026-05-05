"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (actionFilter) params.set("action", actionFilter);

        const res = await fetch(`/api/admin/audit-log?${params}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.data || []);
          setTotal(data.meta?.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [page, actionFilter]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Track all system activity and changes."
      />

      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
        />
        <span className="text-xs text-slate-400">{total} entries</span>
      </div>

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
