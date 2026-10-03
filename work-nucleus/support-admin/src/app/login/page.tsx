"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, LogIn } from "lucide-react";

export default function SupportAdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "unauthorized") {
      setError(
        "Access denied. Your account does not have support admin privileges."
      );
    }

    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) {
          router.push("/");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router]);

  const handleLogin = () => {
    window.location.href = "/auth/login";
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent)]" />

      <div className="relative w-full max-w-md px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-white">
              Support Admin Portal
            </h1>
            <p className="mt-2 text-center text-sm text-slate-400">
              Authorized personnel only. Sign in with your admin credentials.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </button>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-3">
            <p className="text-xs leading-relaxed text-slate-500">
              This portal is restricted to QuestEdge support staff.
              Unauthorized access attempts are logged.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          QuestEdge Support Admin &middot; All sessions are audited
        </p>
      </div>
    </div>
  );
}
