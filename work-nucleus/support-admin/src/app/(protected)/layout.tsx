"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupportSidebar } from "@/components/support-sidebar";
import { SupportTopBar } from "@/components/support-top-bar";
import { useProfile } from "@/hooks/use-profile";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(IS_MOCK);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (IS_MOCK) return;

    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) {
          setHasSession(true);
        } else {
          router.push("/login");
        }
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setSessionChecked(true));
  }, [router]);

  useEffect(() => {
    if (IS_MOCK) return;
    if (!sessionChecked || !hasSession || profileLoading) return;

    if (profile && profile.role && !["SUPPORT_REP", "SUPPORT_ADMIN"].includes(profile.role)) {
      router.push("/login?error=unauthorized");
    }
  }, [profile, profileLoading, sessionChecked, hasSession, router]);

  if (IS_MOCK) {
    if (profileLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex h-screen">
        <SupportSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <SupportTopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    );
  }

  if (!sessionChecked || !hasSession) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profileLoading && profile && !["SUPPORT_REP", "SUPPORT_ADMIN"].includes(profile.role ?? "")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold">Support Admin Access Restricted</h1>
          <p className="mt-2 text-sm text-slate-400">
            Signed in as <span className="font-semibold text-white">{profile.email || "Current User"}</span>.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            This account does not have <span className="text-amber-400 font-mono">SUPPORT_ADMIN</span> or <span className="text-amber-400 font-mono">SUPPORT_REP</span> role assigned in the database.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="/auth/logout"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Sign Out & Switch Account
            </a>
            <a
              href={process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://questedge.vercel.app"}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition"
            >
              Go to Main QuestEdge App
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SupportSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SupportTopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
