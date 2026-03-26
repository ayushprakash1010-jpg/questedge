"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface SessionItem {
  id: string;
  sessionType: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  ipAddress: string | null;
  supportUser: { id: string; name: string };
  targetOrg: { id: string; name: string };
  targetUser: { id: string; name: string } | null;
}

export default function SessionHistoryPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/support/sessions?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.data || []);
        setMeta(d.meta || { total: 0, page: 1, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/support-admin/tools">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Session History</h1>
          <p className="text-muted-foreground">Audit trail of all shadow and impersonation sessions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Support Rep</th>
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Target User</th>
                    <th className="pb-2 pr-4">Reason</th>
                    <th className="pb-2 pr-4">Started</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Badge variant={s.sessionType === "SHADOW" ? "outline" : "destructive"}>
                          {s.sessionType}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">{s.supportUser.name}</td>
                      <td className="py-3 pr-4">{s.targetOrg.name}</td>
                      <td className="py-3 pr-4">{s.targetUser?.name || "—"}</td>
                      <td className="py-3 pr-4 max-w-[200px] truncate">{s.reason}</td>
                      <td className="py-3 pr-4 text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                      <td className="py-3">
                        {s.endedAt ? (
                          <Badge className="bg-gray-100 text-gray-800">Ended</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
