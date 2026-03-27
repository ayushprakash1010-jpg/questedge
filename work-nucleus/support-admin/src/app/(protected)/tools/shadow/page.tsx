"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Eye, StopCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface OrgOption { id: string; name: string; }
interface UserOption { id: string; name: string; email: string; role: string; }
interface ActiveSession {
  id: string;
  sessionType: string;
  reason: string;
  startedAt: string;
  targetOrg: { name: string };
  targetUser: { name: string } | null;
}

export default function ShadowModePage() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [reason, setReason] = useState("");
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/support/organizations?limit=100")
      .then((r) => r.json())
      .then((d) => setOrgs((d.data || []).map((o: any) => ({ id: o.id, name: o.name }))));

    fetch("/api/support/sessions/active")
      .then((r) => r.json())
      .then((sessions) => {
        if (Array.isArray(sessions) && sessions.length > 0) {
          setActiveSession(sessions[0]);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedOrg) { setUsers([]); return; }
    fetch(`/api/support/organizations/${selectedOrg}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.data || d));
  }, [selectedOrg]);

  const startSession = async () => {
    if (!selectedOrg || !reason) return;
    setLoading(true);
    const res = await fetch("/api/support/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetOrgId: selectedOrg,
        targetUserId: selectedUser || undefined,
        reason,
      }),
    });
    if (res.ok) {
      const session = await res.json();
      setActiveSession(session);
    }
    setLoading(false);
  };

  const endSession = async () => {
    if (!activeSession) return;
    await fetch(`/api/support/sessions/${activeSession.id}/end`, { method: "POST" });
    setActiveSession(null);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tools">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Shadow Mode</h1>
      </div>

      {activeSession ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Eye className="h-5 w-5" /> Active Shadow Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p><strong>Organization:</strong> {activeSession.targetOrg.name}</p>
              {activeSession.targetUser && (
                <p><strong>Viewing as:</strong> {activeSession.targetUser.name}</p>
              )}
              <p><strong>Reason:</strong> {activeSession.reason}</p>
              <p><strong>Started:</strong> {new Date(activeSession.startedAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Badge className="bg-blue-100 text-blue-800">Read-Only Mode</Badge>
              <span>All actions are being logged for audit purposes</span>
            </div>
            <Button variant="destructive" size="sm" onClick={endSession}>
              <StopCircle className="h-4 w-4 mr-2" /> End Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Start Shadow Session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization *</label>
              <Select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
                <option value="">Select organization</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>

            {users.length > 0 && (
              <div>
                <label className="text-sm font-medium">View as User (optional)</label>
                <Select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                  <option value="">No specific user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Why are you starting this session?"
              />
            </div>

            <Button onClick={startSession} disabled={loading || !selectedOrg || !reason}>
              <Eye className="h-4 w-4 mr-2" />
              {loading ? "Starting..." : "Start Shadow Session"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
