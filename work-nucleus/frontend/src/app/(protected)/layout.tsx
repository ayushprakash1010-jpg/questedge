"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useProfile } from "@/hooks/use-profile";
import { registerServiceWorker } from "@/lib/pwa";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

// Map userType from backend OR current URL path → sidebar theme
function resolveSidebarUserType(
  userType?: string,
  pathname?: string
): "company" | "recruiter" | "candidate" {
  // If we are currently setting up a profile, force the sidebar to match the route
  if (pathname?.startsWith("/recruiter")) return "recruiter";
  if (pathname?.startsWith("/candidate")) return "candidate";
  if (pathname?.startsWith("/company") || pathname?.startsWith("/dashboard")) return "company";

  // Fallback to the userType from the database
  if (userType === "RECRUITER") return "recruiter";
  if (userType === "CANDIDATE") return "candidate";
  return "company";
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useUser();
  const { profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();
  const pathname = usePathname();

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
    // (unless they are already on a role-specific profile setup page)
    const isRecruiterOrCandidate =
      (profile as any)?.userType === "RECRUITER" ||
      (profile as any)?.userType === "CANDIDATE";

    if (profile && !profile.isProvisioned && !isRecruiterOrCandidate) {
      if (!pathname.includes("/profile") && !pathname.includes("/onboarding")) {
        router.push("/onboarding");
      }
    }
  }, [user, profile, authLoading, profileLoading, router, pathname]);

  const sidebarUserType = resolveSidebarUserType((profile as any)?.userType, pathname);

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
        <Sidebar userType={sidebarUserType} />
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
      <Sidebar userType={sidebarUserType} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
