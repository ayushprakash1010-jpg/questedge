"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserX,
  UserCheck,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  userType: string;
  isActive: boolean;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  organization?: { id: string; name: string; industry?: string };
  recentActivity?: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    ipAddress?: string;
    createdAt: string;
  }>;
}

interface ConfirmState {
  open: boolean;
  action: "deactivate" | "activate" | null;
  reason: string;
  submitting: boolean;
  error: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useProfile();
  const isAdmin = profile?.role === "SUPPORT_ADMIN";

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"profile" | "activity" | "actions">("profile");
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    action: null,
    reason: "",
    submitting: false,
    error: "",
  });
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.userId]);

  async function fetchUser() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/users/${params.userId}`);
      if (!res.ok) throw new Error("User not found");
      setUser(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAction() {
    if (!confirm.action || !confirm.reason.trim()) return;
    setConfirm((c) => ({ ...c, submitting: true, error: "" }));
    try {
      const res = await fetch(`/api/support/users/${params.userId}/${confirm.action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: confirm.reason }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Action failed");
      }
      setSuccessMsg(
        confirm.action === "deactivate" ? "User deactivated successfully." : "User reactivated successfully."
      );
      setConfirm({ open: false, action: null, reason: "", submitting: false, error: "" });
      await fetchUser();
    } catch (e: any) {
      setConfirm((c) => ({ ...c, submitting: false, error: e.message }));
    }
  }

  if (loading)
    return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading user...</div>;
  if (error || !user)
    return (
      <div className="p-8 text-center text-sm text-red-600">
        {error ?? "User not found"}{" "}
        <button onClick={fetchUser} className="underline text-primary">Retry</button>
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {user.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 border border-green-200">
            <CheckCircle2 className="h-4 w-4" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-500 border border-slate-200">
            <XCircle className="h-4 w-4" /> Inactive
          </span>
        )}
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {(["profile", "activity", ...(isAdmin ? ["actions"] : [])] as ("profile" | "activity" | "actions")[]).map((t) => (
          <button
            key={t}
            id={`user-tab-${t}`}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Role", value: user.role },
              { label: "User Type", value: user.userType },
              { label: "Organization", value: user.organization?.name ?? "—", link: user.orgId ? `/organizations/${user.orgId}` : undefined },
              { label: "Industry", value: user.organization?.industry ?? "—" },
              { label: "Created", value: new Date(user.createdAt).toLocaleDateString() },
              { label: "Updated", value: new Date(user.updatedAt).toLocaleDateString() },
            ].map(({ label, value, link }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                {link ? (
                  <Link href={link} className="font-medium text-primary hover:underline">{value}</Link>
                ) : (
                  <p className="font-medium">{value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {(!user.recentActivity || user.recentActivity.length === 0) ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No recent activity.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Timestamp</th>
                  <th scope="col" className="px-4 py-3 text-left">Action</th>
                  <th scope="col" className="px-4 py-3 text-left">Entity</th>
                  <th scope="col" className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {user.recentActivity.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {a.entityType}{a.entityId ? ` · ${a.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{a.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Actions Tab — SUPPORT_ADMIN only */}
      {tab === "actions" && isAdmin && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-sm">Account Actions</h3>
          <div className="flex gap-3">
            {user.isActive ? (
              <button
                id="btn-deactivate-user"
                onClick={() => setConfirm({ open: true, action: "deactivate", reason: "", submitting: false, error: "" })}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <UserX className="h-4 w-4" /> Deactivate Account
              </button>
            ) : (
              <button
                id="btn-activate-user"
                onClick={() => setConfirm({ open: true, action: "activate", reason: "", submitting: false, error: "" })}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <UserCheck className="h-4 w-4" /> Reactivate Account
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {user.isActive
              ? "Deactivating will prevent all logins immediately and write an audit log entry."
              : "Reactivating will restore access to the platform."}
          </p>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h2 id="confirm-dialog-title" className="font-semibold text-base">
                  {confirm.action === "deactivate" ? "Deactivate User Account" : "Reactivate User Account"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {confirm.action === "deactivate"
                    ? `This will prevent ${user.name} from accessing the platform immediately.`
                    : `This will restore ${user.name}'s access to the platform.`}
                </p>
              </div>
            </div>

            {confirm.action === "deactivate" && (
              <ul className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-amber-200">
                <li>• Prevent all logins immediately</li>
                <li>• Write an audit log entry</li>
              </ul>
            )}

            <div>
              <label htmlFor="confirm-reason" className="block text-sm font-medium mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="confirm-reason"
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Minimum 10 characters required..."
                value={confirm.reason}
                onChange={(e) => setConfirm((c) => ({ ...c, reason: e.target.value }))}
              />
            </div>

            {confirm.error && (
              <p className="text-xs text-red-600">{confirm.error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                id="confirm-cancel"
                onClick={() => setConfirm({ open: false, action: null, reason: "", submitting: false, error: "" })}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                id="confirm-submit"
                disabled={confirm.reason.trim().length < 10 || confirm.submitting}
                onClick={submitAction}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  confirm.action === "deactivate"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {confirm.submitting ? "Processing…" : confirm.action === "deactivate" ? "Deactivate Account" : "Reactivate Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
