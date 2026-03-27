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
