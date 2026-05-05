"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";

interface Board {
  session: {
    id: string;
    groupName: string;
    status: string;
    targetDistribution: Record<string, number>;
    decisionLog: Array<{ employeeId: string; oldRating: number | null; newRating: number; reason: string }>;
  };
  assessments: Array<{
    id: string;
    finalRating: string | null;
    employee: { id: string; name: string };
    manager: { id: string; name: string };
  }>;
  target: Record<string, number>;
  actualCount: Record<string, number>;
  actualPct: Record<string, number>;
  forceFitWarning: boolean;
}

const BUCKETS = [5, 4, 3, 2, 1];

export default function CalibrationBoardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/v2/appraisal/calibration/${sessionId}/board`);
    if (res.ok) setBoard(await res.json());
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function move(employeeId: string, currentRating: number) {
    const newRatingStr = window.prompt("Move to which rating? (1-5)");
    const newRating = Number(newRatingStr);
    if (!newRating || newRating < 1 || newRating > 5 || newRating === currentRating) return;
    const reason = window.prompt("Reason for the move (audit-logged):");
    if (!reason || reason.length < 5) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/appraisal/calibration/${sessionId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, newRating, reason }),
      });
      if (!res.ok) throw new Error("Move failed");
      await refresh();
      toast.success("Rating moved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    if (!window.confirm("Lock the session? This freezes all ratings.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/appraisal/calibration/${sessionId}/lock`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Lock failed");
      await refresh();
      toast.success("Session locked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lock failed");
    } finally {
      setBusy(false);
    }
  }

  if (!board) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const grouped: Record<number, Board["assessments"]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const a of board.assessments) {
    const r = a.finalRating ? Math.round(Number(a.finalRating)) : 3;
    if (grouped[r]) grouped[r].push(a);
  }

  const locked = board.session.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Calibration: {board.session.groupName}
          </h1>
          <Badge className="mt-2">{board.session.status}</Badge>
        </div>
        <div className="flex gap-2">
          {!locked && (
            <Button onClick={lock} disabled={busy}>
              <Lock className="h-4 w-4" /> Lock &amp; finalise
            </Button>
          )}
        </div>
      </header>

      {board.forceFitWarning && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle />
          <AlertDescription>
            More than 10% of participants have been moved — please justify in
            the decision log.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 text-xs">
            {BUCKETS.map((r) => (
              <div
                key={r}
                className="rounded-md border border-slate-200/60 p-2"
              >
                <p className="text-slate-500">Rating {r}</p>
                <p className="text-lg font-bold text-slate-900">
                  {board.actualPct[r] ?? 0}%
                </p>
                <p className="text-slate-400">target {board.target[r] ?? 0}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-5 gap-3">
        {BUCKETS.map((r) => (
          <Card key={r}>
            <CardHeader>
              <CardTitle className="text-sm">
                {r} ({grouped[r].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped[r].map((a) => (
                <button
                  key={a.id}
                  disabled={locked || busy}
                  onClick={() => move(a.employee.id, r)}
                  className="w-full rounded-md border border-slate-200/60 p-2 text-left transition-colors hover:border-indigo-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {a.employee.name}
                  </p>
                  <p className="text-xs text-slate-500">{a.manager.name}</p>
                </button>
              ))}
              {grouped[r].length === 0 && (
                <p className="text-xs text-slate-400">No employees here.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Decision log ({board.session.decisionLog.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {board.session.decisionLog.map((e, i) => (
            <div key={i} className="border-b border-slate-100 py-1">
              {e.employeeId.slice(0, 8)}: {e.oldRating ?? "—"} → {e.newRating} ·{" "}
              {e.reason}
            </div>
          ))}
          {board.session.decisionLog.length === 0 && (
            <p className="text-slate-500">No moves yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
