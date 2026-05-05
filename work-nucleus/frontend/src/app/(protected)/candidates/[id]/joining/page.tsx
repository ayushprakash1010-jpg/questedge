"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ChecklistItem {
  key: string;
  label: string;
  required?: boolean;
  owner: "CANDIDATE" | "HR";
}

interface Joining {
  id: string;
  status: string;
  joinDate: string;
  submissions: Record<string, { status?: string; fileUrl?: string; reviewStatus?: string; reviewerNotes?: string }>;
  checklist: { id: string; name: string; items: ChecklistItem[] };
  offer: {
    id: string;
    application: { candidate: { id: string; name: string }; hiringPlan: { designation: string } };
  };
}

export default function HRCandidateJoiningPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Joining | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/v2/joining?applicationId=${id}`);
    if (res.ok) {
      const j = await res.json();
      setData(j ?? null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function review(itemKey: string, decision: "APPROVED" | "NEEDS_REVISION") {
    if (!data) return;
    const notes =
      decision === "NEEDS_REVISION"
        ? window.prompt("What revision is needed?") ?? undefined
        : undefined;
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/joining/${data.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey, decision, notes }),
      });
      if (!res.ok) throw new Error("Review failed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="p-6 text-slate-500">
        No joining record yet — it will be created automatically when the offer is signed.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Joining: {data.offer.application.candidate.name}
        </h1>
        <p className="text-sm text-slate-500">
          {data.offer.application.hiringPlan.designation} · Join date {new Date(data.joinDate).toLocaleDateString()}
        </p>
        <Badge className="mt-2">{data.status}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Document submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.checklist.items
            .filter((i) => i.owner === "CANDIDATE")
            .map((item) => {
              const sub = data.submissions[item.key];
              return (
                <div key={item.key} className="flex items-start justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {sub?.status === "SUBMITTED" ? (
                      <p className="text-xs text-slate-600">
                        Submitted ·{" "}
                        {sub.fileUrl ? (
                          <a className="text-blue-600 underline" href={sub.fileUrl} target="_blank" rel="noreferrer">
                            view file
                          </a>
                        ) : (
                          "file pending"
                        )}
                        {sub.reviewStatus && ` · ${sub.reviewStatus}`}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Not submitted</p>
                    )}
                    {sub?.reviewerNotes && (
                      <p className="text-xs text-amber-700 mt-1">Reviewer note: {sub.reviewerNotes}</p>
                    )}
                  </div>
                  {sub?.status === "SUBMITTED" && sub.reviewStatus !== "APPROVED" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => review(item.key, "APPROVED")} disabled={busy}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(item.key, "NEEDS_REVISION")} disabled={busy}>
                        <XCircle className="w-4 h-4 mr-1" /> Revise
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
