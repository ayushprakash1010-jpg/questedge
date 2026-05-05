"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useProfile } from "@/hooks/use-profile";
import { registerServiceWorker } from "@/lib/pwa";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useUser();
  const { profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (IS_MOCK) return; // skip auth checks in mock mode
    if (authLoading || profileLoading) return;

    // Not logged in — redirect to Auth0 login
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Logged in but not provisioned — redirect to onboarding
    if (profile && !profile.isProvisioned) {
      router.push("/onboarding");
    }
  }, [user, profile, authLoading, profileLoading, router]);

  if (IS_MOCK) {
    if (profileLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex h-screen">
        <Sidebar userRole={profile?.role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
        </div>
      </div>
    );
  }

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen">
      <Sidebar userRole={profile?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
