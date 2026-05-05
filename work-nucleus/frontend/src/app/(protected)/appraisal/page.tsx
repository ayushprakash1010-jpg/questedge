"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, MessageSquare, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

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

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My Appraisal"
        subtitle="Cycles, goals, self-assessment, and peer feedback at a glance."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" /> Active cycles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cycles.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-slate-200/60 p-2"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.type} · stage: {c.status}
                  </p>
                </div>
                <Link href={`/appraisal/cycles/${c.id}/assessment`}>
                  <Button size="sm" variant="outline">
                    Open
                  </Button>
                </Link>
              </div>
            ))}
            {data.cycles.length === 0 && (
              <p className="text-sm text-slate-500">No active cycles.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" /> Peer feedback requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold leading-none text-slate-900">
              {data.peerFeedbackPending}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pending requests waiting on you.
            </p>
            {data.peerFeedbackPending > 0 && (
              <Link
                href="/appraisal/peer-incoming"
                className="mt-2 inline-block text-sm text-indigo-600 underline"
              >
                Review now →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> My goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-md border border-slate-200/60 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{g.title}</p>
                <p className="text-xs text-slate-500">
                  {g.cycle.name} · weight {g.weight}%
                </p>
              </div>
              <Badge>{g.status}</Badge>
            </div>
          ))}
          {data.goals.length === 0 && (
            <p className="text-sm text-slate-500">
              No goals captured for current cycles.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assessment history</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.assessments.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">No assessments yet.</p>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Type</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Rating</DataTableHead>
                  <DataTableHead>Acknowledged</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {data.assessments.map((a) => (
                  <DataTableRow key={a.id}>
                    <DataTableCell>{a.type}</DataTableCell>
                    <DataTableCell>
                      <Badge>{a.status}</Badge>
                    </DataTableCell>
                    <DataTableCell>
                      {a.finalRating ?? "—"}{" "}
                      {a.ratingLabel && `(${a.ratingLabel})`}
                    </DataTableCell>
                    <DataTableCell className="text-xs text-slate-500">
                      {a.acknowledgedAt
                        ? new Date(a.acknowledgedAt).toLocaleDateString()
                        : "Pending"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
