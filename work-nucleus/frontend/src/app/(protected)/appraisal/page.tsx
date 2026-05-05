"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, MessageSquare, ListChecks, Award } from "lucide-react";

interface Cycle {
  id: string;
  name: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
}

interface MyGoal {
  id: string;
  title: string;
  weight: number;
  status: string;
  cycle: { id: string; name: string; status: string };
}

interface MyAssessment {
  id: string;
  cycleId: string;
  type: string;
  status: string;
  finalRating: string | null;
  ratingLabel: string | null;
  acknowledgedAt: string | null;
}

interface HomeData {
  cycles: Cycle[];
  goals: MyGoal[];
  peerFeedbackPending: number;
  assessments: MyAssessment[];
}

export default function AppraisalHomePage() {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    fetch("/api/v2/appraisal/assessments/home")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Award className="w-6 h-6 text-indigo-600" /> My Appraisal
        </h1>
        <p className="text-sm text-slate-500">Cycles, goals, self-assessment, and peer feedback at a glance.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" /> Active cycles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cycles.map((c) => (
              <div key={c.id} className="border rounded-md p-2 flex justify-between items-center">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.type} · stage: {c.status}</p>
                </div>
                <Link href={`/appraisal/cycles/${c.id}/assessment`}>
                  <Button size="sm" variant="outline">Open</Button>
                </Link>
              </div>
            ))}
            {data.cycles.length === 0 && <p className="text-slate-500 text-sm">No active cycles.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Peer feedback requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{data.peerFeedbackPending}</p>
            <p className="text-xs text-slate-500 mt-1">Pending requests waiting on you.</p>
            {data.peerFeedbackPending > 0 && (
              <Link href="/appraisal/peer-incoming" className="text-blue-600 text-sm underline mt-2 inline-block">
                Review now →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" /> My goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.goals.map((g) => (
            <div key={g.id} className="border rounded-md p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{g.title}</p>
                <p className="text-xs text-slate-500">
                  {g.cycle.name} · weight {g.weight}%
                </p>
              </div>
              <Badge>{g.status}</Badge>
            </div>
          ))}
          {data.goals.length === 0 && <p className="text-slate-500 text-sm">No goals captured for current cycles.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assessment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Acknowledged</th>
              </tr>
            </thead>
            <tbody>
              {data.assessments.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3">{a.type}</td>
                  <td className="px-4 py-3">
                    <Badge>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{a.finalRating ?? "—"} {a.ratingLabel && `(${a.ratingLabel})`}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleDateString() : "Pending"}
                  </td>
                </tr>
              ))}
              {data.assessments.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No assessments yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
