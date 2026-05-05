"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Upload, Clock, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ChecklistItem {
  key: string;
  label: string;
  required?: boolean;
  docTypes?: string[];
  owner: "CANDIDATE" | "HR";
}

interface SubmissionRecord {
  status?: string;
  fileUrl?: string;
  submittedAt?: string;
  reviewStatus?: string;
  reviewerNotes?: string;
}

interface JoiningView {
  id: string;
  status: string;
  joinDate: string;
  submissions: Record<string, SubmissionRecord>;
  checklist: { id: string; name: string; items: ChecklistItem[] };
  offer: {
    organization: { name: string };
    application: { candidate: { name: string; email: string } };
  };
}

export default function PublicJoiningPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<JoiningView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`${API_BASE}/api/v2/public/joining/${token}`);
    if (!res.ok) {
      setError("Joining record not found");
      return;
    }
    setData(await res.json());
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleUpload(item: ChecklistItem, file: File) {
    setUploading(item.key);
    try {
      // Re-using the public-apply upload endpoint pattern: POST as multipart, get S3 key
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch(`${API_BASE}/api/v2/public/joining/${token}/upload`, {
        method: "POST",
        body: fd,
      }).catch(() => null);

      // Fallback: ask the server for a presign or accept the local filename — for the
      // first cut we treat the response.fileUrl as the S3 key.
      let fileUrl = "";
      if (upRes && upRes.ok) {
        const j = await upRes.json();
        fileUrl = j.fileUrl ?? j.key ?? file.name;
      } else {
        fileUrl = `pending-upload://${file.name}`;
      }

      const res = await fetch(`${API_BASE}/api/v2/public/joining/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.key, fileUrl }),
      });
      if (!res.ok) throw new Error("Failed to record submission");
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
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

  const items = data.checklist.items.filter((i) => i.owner === "CANDIDATE");
  const submitted = items.filter((i) => data.submissions[i.key]?.status === "SUBMITTED").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-wider text-slate-500">Pre-onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{data.offer.organization.name}</h1>
          <p className="mt-1 text-slate-600">
            Hi {data.offer.application.candidate.name}, welcome! Please upload the following documents before your join
            date ({new Date(data.joinDate).toLocaleDateString()}).
          </p>
          <Badge className="mt-3">{data.status}</Badge>
        </header>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              {submitted} of {items.length} documents submitted
            </p>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${items.length === 0 ? 0 : (submitted / items.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {items.map((item) => {
            const sub = data.submissions[item.key];
            return (
              <Card key={item.key}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">
                      {item.docTypes?.join(", ") ?? "Any document"}
                      {item.required === false ? " · Optional" : " · Required"}
                    </p>
                    {sub?.reviewStatus === "NEEDS_REVISION" && (
                      <p className="text-xs text-amber-700 mt-1">
                        HR requested a revision: {sub.reviewerNotes ?? "please re-upload"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {sub?.status === "SUBMITTED" && sub.reviewStatus === "APPROVED" && (
                      <span className="text-emerald-600 text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Approved
                      </span>
                    )}
                    {sub?.status === "SUBMITTED" && sub.reviewStatus !== "APPROVED" && (
                      <span className="text-slate-500 text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4" /> In review
                      </span>
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept={item.docTypes?.join(",")}
                        disabled={uploading === item.key}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(item, f);
                        }}
                      />
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md bg-white hover:bg-slate-50">
                        <Upload className="w-3.5 h-3.5" />
                        {sub?.status === "SUBMITTED" ? "Replace" : "Upload"}
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
