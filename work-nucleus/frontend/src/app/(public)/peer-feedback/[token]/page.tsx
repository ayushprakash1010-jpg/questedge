"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Request {
  id: string;
  status: string;
  isAnonymous: boolean;
  relationship: string;
  cycle: { name: string; status: string };
  subject: { name: string };
}

const QUESTIONS = [
  { key: "strengths", label: "What does this person do really well?" },
  { key: "growth", label: "What's one area they could grow in?" },
  { key: "collaboration", label: "How do they show up when you collaborate?" },
];

export default function PeerFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Request | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v2/public/peer-feedback/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Request not found or has expired");
        return r.json();
      })
      .then((j) => {
        setData(j);
        if (j.status === "SUBMITTED") setSubmitted(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [token]);

  async function submit() {
    if (!data) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/public/peer-feedback/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: answers }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    const reason = window.prompt("Brief reason for declining (optional but helpful):") ?? "no reason given";
    setBusy(true);
    try {
      await fetch(`${API_BASE}/api/v2/public/peer-feedback/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Thank you!</p>
            <p className="text-sm text-slate-600 mt-2">
              {data.isAnonymous
                ? "Your feedback was recorded anonymously."
                : "Your feedback was recorded."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-6">
          {data.isAnonymous && <Badge className="mb-2">Anonymous</Badge>}
          <h1 className="text-2xl font-semibold">Feedback for {data.subject.name}</h1>
          <p className="text-sm text-slate-500">
            Cycle: {data.cycle.name} · Relationship: {data.relationship.replace("_", " ").toLowerCase()}
          </p>
        </header>

        {QUESTIONS.map((q) => (
          <Card key={q.key} className="mb-3">
            <CardHeader>
              <CardTitle className="text-sm">{q.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={answers[q.key] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
              />
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button onClick={submit} disabled={busy || Object.values(answers).filter((v) => v.trim().length > 5).length < 1}>
            Submit feedback
          </Button>
          <Button variant="outline" onClick={decline} disabled={busy}>
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
