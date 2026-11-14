"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Ticket, Plus, Clock, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface TicketItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  reportedBy: string;
  slaDeadline: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  _count: { notes: number; escalations: number };
}

const priorityColor: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-green-100 text-green-800",
};

const statusColor: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  WAITING_ON_CLIENT: "bg-yellow-100 text-yellow-800",
  ESCALATED: "bg-red-100 text-red-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

function SlaIndicator({ deadline, status }: { deadline: string | null; status?: string }) {
  if (!deadline || status === "RESOLVED" || status === "CLOSED") return null;
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (hoursLeft < 0) return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Breached</Badge>;
  if (hoursLeft < 2) return <Badge className="bg-red-100 text-red-800 text-xs"><Clock className="h-3 w-3 mr-1" /> {hoursLeft}h left</Badge>;
  if (hoursLeft < 8) return <Badge className="bg-yellow-100 text-yellow-800 text-xs"><Clock className="h-3 w-3 mr-1" /> {hoursLeft}h left</Badge>;
  return <Badge className="bg-green-100 text-green-800 text-xs"><Clock className="h-3 w-3 mr-1" /> {hoursLeft}h left</Badge>;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchTickets = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    fetch(`/api/support/tickets?${params}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error || body?.message || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        setTickets(d.data || []);
        setMeta(d.meta || { total: 0, page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.message || "Failed to load support tickets");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [page, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">{meta.total} total tickets</p>
        </div>
        <Link href="/tickets/new">
          <Button><Plus className="h-4 w-4 mr-2" /> New Ticket</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-[180px]">
          <option value="all">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_ON_CLIENT">Waiting on Client</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="w-[160px]">
          <option value="all">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>Failed to load tickets: {error}</span>
          <Button variant="outline" size="sm" onClick={fetchTickets}>Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? null : !tickets.length ? (
        <p className="text-muted-foreground text-center py-10">No tickets found.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/tickets/${t.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{t.organization.name}</span>
                        <span>&middot;</span>
                        <span>Reported by {t.reportedBy}</span>
                        <span>&middot;</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        {t.assignee && (
                          <>
                            <span>&middot;</span>
                            <span>Assigned to {t.assignee.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <SlaIndicator deadline={t.slaDeadline} status={t.status} />
                      <Badge className={priorityColor[t.priority]}>{t.priority}</Badge>
                      <Badge className={statusColor[t.status]}>{t.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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
