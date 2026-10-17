"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BadgeX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  ExternalLink,
  Trophy,
  Users,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

interface RecruiterDetail {
  id: string;
  name: string;
  email: string;
  headline?: string;
  specializations: string[];
  experienceYears?: number;
  linkedinUrl?: string;
  portfolioUrl?: string;
  isVerified: boolean;
  verifiedAt?: string;
  isActive: boolean;
  referralCount: number;
  rewardCount: number;
  participationCount: number;
  createdAt: string;
  rewards?: Array<{
    id: string;
    rewardAmount?: number;
    currency: string;
    status: string;
    hiredAt?: string;
    paidAt?: string;
    createdAt: string;
  }>;
  referrals?: Array<{
    id: string;
    status?: string;
    createdAt: string;
    mandate?: { id: string; title: string; organization?: { name: string } };
    candidateProfile?: { id: string; name: string; email: string };
  }>;
}

interface ConfirmState {
  open: boolean;
  action: "deactivate" | "verify" | null;
  reason: string;
  submitting: boolean;
  error: string;
}

export default function RecruiterDetailPage() {
  const params = useParams();
  const { profile } = useProfile();
  const isAdmin = profile?.role === "SUPPORT_ADMIN";

  const [recruiter, setRecruiter] = useState<RecruiterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"profile" | "referrals" | "rewards" | "actions">("profile");
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, action: null, reason: "", submitting: false, error: "",
  });
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { fetchRecruiter(); }, [params.recruiterId]);

  async function fetchRecruiter() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/support/recruiters/${params.recruiterId}`);
      if (!res.ok) throw new Error("Recruiter not found");
      setRecruiter(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function submitAction() {
    if (!confirm.action) return;
    setConfirm((c) => ({ ...c, submitting: true, error: "" }));
    try {
      let res: Response;
      if (confirm.action === "verify") {
        res = await fetch(`/api/support/recruiters/${params.recruiterId}/verify`, { method: "PATCH" });
      } else {
        res = await fetch(`/api/support/recruiters/${params.recruiterId}/deactivate`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: confirm.reason }),
        });
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Action failed");
      }
      setSuccessMsg(
        confirm.action === "verify" ? "Recruiter verified successfully." : "Recruiter deactivated successfully."
      );
      setConfirm({ open: false, action: null, reason: "", submitting: false, error: "" });
      await fetchRecruiter();
    } catch (e: any) {
      setConfirm((c) => ({ ...c, submitting: false, error: e.message }));
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading recruiter...</div>;
  if (error || !recruiter) return (
    <div className="p-8 text-center text-sm text-red-600">
      {error ?? "Recruiter not found"}{" "}
      <button onClick={fetchRecruiter} className="underline text-primary">Retry</button>
    </div>
  );

  const tabs = ["profile", "referrals", "rewards", ...(isAdmin ? ["actions"] : [])] as const;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/marketplace/recruiters" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Recruiters
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{recruiter.name}</h1>
          <p className="text-sm text-muted-foreground">{recruiter.email}</p>
          {recruiter.headline && <p className="text-sm text-muted-foreground mt-0.5 italic">{recruiter.headline}</p>}
        </div>
        <div className="flex items-center gap-2">
          {recruiter.isVerified
            ? <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm font-medium text-green-700"><BadgeCheck className="h-4 w-4" /> Verified</span>
            : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500"><BadgeX className="h-4 w-4" /> Unverified</span>}
          {recruiter.isActive
            ? <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm font-medium text-blue-700"><CheckCircle2 className="h-4 w-4" /> Active</span>
            : <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm font-medium text-red-600"><XCircle className="h-4 w-4" /> Inactive</span>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Referrals", value: recruiter.referralCount, icon: Users },
          { label: "Rewards", value: recruiter.rewardCount, icon: Trophy },
          { label: "Participations", value: recruiter.participationCount, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm text-center">
            <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">✓ {successMsg}</div>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {tabs.map((t) => (
          <button key={t} id={`recruiter-tab-${t}`}
            onClick={() => setTab(t as typeof tab)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Experience", value: recruiter.experienceYears ? `${recruiter.experienceYears} years` : "—" },
              { label: "Verified At", value: recruiter.verifiedAt ? new Date(recruiter.verifiedAt).toLocaleDateString() : "Not verified" },
              { label: "Member Since", value: new Date(recruiter.createdAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>
          {recruiter.specializations.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Specializations</p>
              <div className="flex flex-wrap gap-1.5">
                {recruiter.specializations.map((s) => (
                  <span key={s} className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{s}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-4">
            {recruiter.linkedinUrl && (
              <a href={recruiter.linkedinUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> LinkedIn
              </a>
            )}
            {recruiter.portfolioUrl && (
              <a href={recruiter.portfolioUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Portfolio
              </a>
            )}
          </div>
        </div>
      )}

      {/* Referrals Tab */}
      {tab === "referrals" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {(!recruiter.referrals || recruiter.referrals.length === 0) ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No referrals yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Mandate</th>
                  <th scope="col" className="px-4 py-3 text-left">Candidate</th>
                  <th scope="col" className="px-4 py-3 text-left">Status</th>
                  <th scope="col" className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recruiter.referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs">{r.mandate?.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.mandate?.organization?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs">{r.candidateProfile?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.candidateProfile?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{r.status ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Rewards Tab */}
      {tab === "rewards" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {(!recruiter.rewards || recruiter.rewards.length === 0) ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No rewards yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Status</th>
                  <th scope="col" className="px-4 py-3 text-left">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left">Hired</th>
                  <th scope="col" className="px-4 py-3 text-left">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recruiter.rewards.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{r.status}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">
                      {r.rewardAmount ? `₹${r.rewardAmount.toLocaleString()} ${r.currency}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.hiredAt ? new Date(r.hiredAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Actions Tab */}
      {tab === "actions" && isAdmin && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h3 className="font-semibold text-sm">Account Actions</h3>
          <div className="flex flex-wrap gap-3">
            {!recruiter.isVerified && (
              <button id="btn-verify-recruiter"
                onClick={() => setConfirm({ open: true, action: "verify", reason: "", submitting: false, error: "" })}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                <BadgeCheck className="h-4 w-4" /> Verify Recruiter
              </button>
            )}
            {recruiter.isActive && (
              <button id="btn-deactivate-recruiter"
                onClick={() => setConfirm({ open: true, action: "deactivate", reason: "", submitting: false, error: "" })}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                <UserX className="h-4 w-4" /> Deactivate Profile
              </button>
            )}
          </div>
          {!recruiter.isActive && (
            <p className="text-xs text-muted-foreground">This recruiter profile is already inactive.</p>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-labelledby="recruiter-confirm-title">
          <div className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h2 id="recruiter-confirm-title" className="font-semibold text-base">
                  {confirm.action === "verify" ? "Verify Recruiter" : "Deactivate Recruiter Profile"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {confirm.action === "verify"
                    ? `This will mark ${recruiter.name} as a verified recruiter on the platform.`
                    : `This will prevent ${recruiter.name}'s profile from appearing on the marketplace.`}
                </p>
              </div>
            </div>

            {confirm.action === "deactivate" && (
              <div>
                <label htmlFor="recruiter-confirm-reason" className="block text-sm font-medium mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea id="recruiter-confirm-reason" rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Minimum 10 characters required..."
                  value={confirm.reason}
                  onChange={(e) => setConfirm((c) => ({ ...c, reason: e.target.value }))} />
              </div>
            )}

            {confirm.error && <p className="text-xs text-red-600">{confirm.error}</p>}

            <div className="flex gap-3 justify-end">
              <button id="recruiter-confirm-cancel"
                onClick={() => setConfirm({ open: false, action: null, reason: "", submitting: false, error: "" })}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
                Cancel
              </button>
              <button id="recruiter-confirm-submit"
                disabled={(confirm.action === "deactivate" && confirm.reason.trim().length < 10) || confirm.submitting}
                onClick={submitAction}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  confirm.action === "deactivate" ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}>
                {confirm.submitting ? "Processing…" : confirm.action === "verify" ? "Confirm Verify" : "Deactivate Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
