"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Clock, User, Building2, MessageSquare, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import Link from "next/link";

interface Note {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; name: string };
}

interface Escalation {
  id: string;
  level: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  escalatedBy: { id: string; name: string };
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  reportedBy: string;
  slaDeadline: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string; industry: string };
  assignee: { id: string; name: string; email: string } | null;
  notes: Note[];
  escalations: Escalation[];
}

const priorityColor: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800", HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800", LOW: "bg-green-100 text-green-800",
};

const statusColor: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800",
  WAITING_ON_CLIENT: "bg-yellow-100 text-yellow-800", ESCALATED: "bg-red-100 text-red-800",
  RESOLVED: "bg-green-100 text-green-800", CLOSED: "bg-gray-100 text-gray-800",
};

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchTicket = () => {
    fetch(`/api/support/tickets/${ticketId}`)
      .then((r) => r.json())
      .then(setTicket)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    await fetch(`/api/support/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, isInternal }),
    });
    setNoteText("");
    fetchTicket();
    setSubmittingNote(false);
  };

  const handleAction = async (action: string) => {
    await fetch(`/api/support/tickets/${ticketId}/${action}`, { method: "POST" });
    fetchTicket();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ticket) return <p className="text-muted-foreground">Ticket not found.</p>;

  const slaStatus = () => {
    if (!ticket.slaDeadline) return null;
    const now = new Date();
    const dl = new Date(ticket.slaDeadline);
    const hoursLeft = Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hoursLeft < 0) return { label: "SLA Breached", color: "text-red-600" };
    if (hoursLeft < 2) return { label: `${hoursLeft}h remaining`, color: "text-red-600" };
    if (hoursLeft < 8) return { label: `${hoursLeft}h remaining`, color: "text-yellow-600" };
    return { label: `${hoursLeft}h remaining`, color: "text-green-600" };
  };

  const sla = slaStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/support-admin/tickets">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{ticket.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {ticket.organization.name}
            <span>&middot;</span>
            Created {new Date(ticket.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={priorityColor[ticket.priority]}>{ticket.priority}</Badge>
          <Badge className={statusColor[ticket.status]}>{ticket.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description || "No description provided."}</p>
            </CardContent>
          </Card>

          {/* Notes Timeline */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Notes ({ticket.notes.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {ticket.notes.map((note) => (
                <div key={note.id} className={`rounded-md border p-3 ${note.isInternal ? "bg-yellow-50 border-yellow-200" : "bg-white"}`}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{note.author.name}</span>
                    <div className="flex items-center gap-2">
                      {note.isInternal && <Badge variant="outline" className="text-xs">Internal</Badge>}
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </div>
              ))}

              <div className="border-t pt-4 space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Add a note..."
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    Internal note (not visible to client)
                  </label>
                  <Button size="sm" onClick={addNote} disabled={submittingNote || !noteText.trim()}>
                    {submittingNote ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escalation History */}
          {ticket.escalations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Escalation History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {ticket.escalations.map((esc) => (
                  <div key={esc.id} className="rounded-md border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Level: <strong>{esc.level}</strong> &middot; By {esc.escalatedBy.name}</span>
                      <span>{new Date(esc.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{esc.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline">{ticket.category.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reported By</span>
                <span>{ticket.reportedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignee</span>
                <span>{ticket.assignee?.name || "Unassigned"}</span>
              </div>
              {sla && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SLA</span>
                  <span className={`font-medium ${sla.color}`}>
                    <Clock className="h-3 w-3 inline mr-1" />{sla.label}
                  </span>
                </div>
              )}
              {ticket.firstResponseAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First Response</span>
                  <span>{new Date(ticket.firstResponseAt).toLocaleString()}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                <>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAction("resolve")}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Resolve
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAction("escalate")}>
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-600" /> Escalate
                  </Button>
                </>
              )}
              {ticket.status === "RESOLVED" && (
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAction("close")}>
                  <XCircle className="h-4 w-4 mr-2" /> Close Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
