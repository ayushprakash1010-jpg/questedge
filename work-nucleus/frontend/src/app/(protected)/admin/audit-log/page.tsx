"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: any;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

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
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (actionFilter) params.set("action", actionFilter);

        const res = await fetch(`/api/admin/audit-log?${params}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.data || []);
          setTotal(data.meta?.total || 0);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [page, actionFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
      <p className="mt-1 text-sm text-slate-500">Track all system activity and changes.</p>

      <div className="mt-4 flex gap-3">
        <Input
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="w-48"
        />
        <span className="self-center text-xs text-slate-400">{total} entries</span>
      </div>

      <Card className="mt-4 border-slate-200">
        <CardContent className="py-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No audit entries</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="py-3 font-medium">Time</th>
                    <th className="py-3 font-medium">User</th>
                    <th className="py-3 font-medium">Action</th>
                    <th className="py-3 font-medium">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50">
                      <td className="py-2.5 text-xs text-slate-500">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-slate-700">{e.user.name}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-xs">{e.action}</Badge>
                      </td>
                      <td className="py-2.5 text-xs text-slate-500">
                        {e.entityType}{e.entityId ? ` (${e.entityId.slice(0, 8)}...)` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > 25 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={entries.length < 25}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
