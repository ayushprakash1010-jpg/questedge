"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Users, GitBranch, Send } from "lucide-react";

interface MandateDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  participationType: string;
  workModel?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  referralRewardAmount?: number;
  numberOfOpenings: number;
  publishedAt?: string;
  createdAt: string;
  organization: { id: string; name: string; industry?: string };
  participations?: Array<{
    id: string;
    recruiter?: { id: string; name: string; email: string; isVerified: boolean };
    status?: string;
    joinedAt?: string;
  }>;
  _count?: { referrals: number; applications: number };
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
  PAUSED: "bg-orange-100 text-orange-700 border-orange-200",
  CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

export default function MandateDetailPage() {
  const params = useParams();
  const [mandate, setMandate] = useState<MandateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "recruiters">("overview");

  useEffect(() => { fetchMandate(); }, [params.mandateId]);

  async function fetchMandate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/support/mandates/${params.mandateId}`);
      if (!res.ok) throw new Error("Mandate not found");
      setMandate(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading mandate...</div>;
  if (error || !mandate) return (
    <div className="p-8 text-center text-sm text-red-600">
      {error ?? "Mandate not found"}{" "}
      <button onClick={fetchMandate} className="underline text-primary">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/marketplace/mandates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Mandates
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{mandate.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Link href={`/organizations/${mandate.organization.id}`} className="text-sm text-primary hover:underline">
              {mandate.organization.name}
            </Link>
            {mandate.organization.industry && (
              <span className="text-xs text-muted-foreground">· {mandate.organization.industry}</span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium shrink-0 ${statusColors[mandate.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
          {mandate.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Openings", value: mandate.numberOfOpenings, icon: Users },
          { label: "Recruiters", value: mandate.participations?.length ?? 0, icon: Users },
          { label: "Referrals", value: mandate._count?.referrals ?? 0, icon: GitBranch },
          { label: "Applications", value: mandate._count?.applications ?? 0, icon: Send },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm text-center">
            <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {(["overview", "recruiters"] as const).map((t) => (
          <button key={t} id={`mandate-tab-${t}`} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "recruiters" ? `Recruiters (${mandate.participations?.length ?? 0})` : t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Participation Type", value: mandate.participationType },
                { label: "Work Model", value: mandate.workModel ?? "—" },
                { label: "Location", value: mandate.location ?? "—" },
                {
                  label: "Salary Range",
                  value: mandate.salaryMin && mandate.salaryMax
                    ? `₹${mandate.salaryMin.toLocaleString()} – ₹${mandate.salaryMax.toLocaleString()} ${mandate.salaryCurrency ?? ""}`
                    : "—",
                },
                {
                  label: "Referral Reward",
                  value: mandate.referralRewardAmount ? `₹${mandate.referralRewardAmount.toLocaleString()}` : "—",
                },
                { label: "Published", value: mandate.publishedAt ? new Date(mandate.publishedAt).toLocaleDateString() : "Not published" },
                { label: "Created", value: new Date(mandate.createdAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {mandate.description && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-semibold mb-3">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{mandate.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Recruiters Tab */}
      {tab === "recruiters" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {(!mandate.participations || mandate.participations.length === 0) ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No recruiters participating yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Recruiter</th>
                  <th scope="col" className="px-4 py-3 text-left">Verified</th>
                  <th scope="col" className="px-4 py-3 text-left">Joined</th>
                  <th scope="col" className="px-4 py-3 text-left sr-only">View</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mandate.participations.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.recruiter?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.recruiter?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.recruiter?.isVerified
                        ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">✓ Verified</span>
                        : <span className="text-xs text-muted-foreground">Unverified</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.recruiter && (
                        <Link href={`/marketplace/recruiters/${p.recruiter.id}`}
                          className="text-xs text-primary hover:underline">
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
