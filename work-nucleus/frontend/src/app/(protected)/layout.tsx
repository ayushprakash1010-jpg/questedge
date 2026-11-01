"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useProfile } from "@/hooks/use-profile";
import { registerServiceWorker } from "@/lib/pwa";

const IS_MOCK =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

// Map userType from backend OR current URL path → sidebar theme
function resolveSidebarUserType(
  userType?: string,
  pathname?: string
): "company" | "recruiter" | "candidate" {
  // If we are currently setting up a profile, force the sidebar to match the route
  if (pathname?.startsWith("/recruiter")) return "recruiter";
  if (pathname === "/candidate" || pathname?.startsWith("/candidate/")) return "candidate";
  if (pathname?.startsWith("/company") || pathname?.startsWith("/dashboard") || pathname?.startsWith("/candidates")) return "company";

  // Fallback to the userType from the database
  if (userType === "RECRUITER") return "recruiter";
  if (userType === "CANDIDATE") return "candidate";
  return "company";
}

// Helper to identify routes shared across all roles
function isSharedRoute(pathname?: string): boolean {
  if (!pathname) return false;
  return (
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useUser();
  const { profile, error: profileError, isLoading: profileLoading, refreshProfile } = useProfile();
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

    // If profile fetching failed due to backend connection issues, do NOT redirect to onboarding!
    if (profileError) {
      console.warn("[ProtectedLayout] Backend connection issue, skipping onboarding redirect:", profileError);
      return;
    }

    // Check if demo user
    const isDemo =
      Boolean((profile as any)?.isDemoAccount) ||
      user?.email?.toLowerCase() === "growytvercel@gmail.com" ||
      user?.name?.toLowerCase() === "growytvercel@gmail.com";

    // Logged in but explicitly verified as NOT provisioned in database
    const isRecruiterOrCandidate =
      (profile as any)?.userType === "RECRUITER" ||
      (profile as any)?.userType === "CANDIDATE";

    if (profile && profile.isProvisioned === false && !isRecruiterOrCandidate && !isDemo) {
      if (!pathname.includes("/profile") && !pathname.includes("/onboarding")) {
        router.push("/onboarding");
        return;
      }
    }

    // Role-based routing enforcement (bypassed for demo account to allow cross-portal browsing)
    if (profile && profile.isProvisioned && !isDemo) {
      const uType = (profile as any).userType;

      // Allow shared routes accessible by all authenticated roles
      const isShared =
        pathname === "/notifications" ||
        pathname.startsWith("/notifications/") ||
        pathname === "/support" ||
        pathname.startsWith("/support/") ||
        pathname === "/profile" ||
        pathname.startsWith("/profile/");

      if (isShared) {
        return;
      }
      if (uType === "RECRUITER" && !pathname.startsWith("/recruiter")) {
        router.push("/recruiter/dashboard");
        return;
      }
      if (uType === "CANDIDATE" && !pathname.startsWith("/candidate")) {
        router.push("/candidate/dashboard");
        return;
      }
      if ((uType === "COMPANY_USER" || uType === "COMPANY_ADMIN") && (
        pathname.startsWith("/recruiter") || 
        pathname === "/candidate" || 
        pathname.startsWith("/candidate/")
      )) {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, profile, profileError, authLoading, profileLoading, router, pathname]);

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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-2 ring-white ring-offset-2 ring-offset-indigo-600 outline-none transition-all"
        >
          Skip to main content
        </a>
        <Sidebar userType={sidebarUserType} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main
            id="main-content"
            tabIndex={-1}
            role="main"
            aria-label="Main Content"
            className="flex-1 overflow-y-auto bg-background p-6 outline-none"
          >
            {children}
          </main>
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

  const isDemo =
    Boolean((profile as any)?.isDemoAccount) ||
    user?.email?.toLowerCase() === "growytvercel@gmail.com" ||
    user?.name?.toLowerCase() === "growytvercel@gmail.com";

  const isRecruiterOrCandidate =
    (profile as any)?.userType === "RECRUITER" ||
    (profile as any)?.userType === "CANDIDATE";

  // If the useEffect is about to redirect to onboarding, show a spinner to prevent flashing
  if (profile && !profile.isProvisioned && !isRecruiterOrCandidate && !isDemo) {
    if (!pathname.includes("/profile") && !pathname.includes("/onboarding")) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      );
    }
  }

  // If the useEffect is about to redirect to a specific role dashboard, show a spinner (skip for demo user)
  if (profile && profile.isProvisioned && !isSharedRoute(pathname) && !isDemo) {
    const uType = (profile as any).userType;
    if (uType === "RECRUITER" && !pathname.startsWith("/recruiter")) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      );
    }
    if (uType === "CANDIDATE" && !pathname.startsWith("/candidate")) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      );
    }
    if ((uType === "COMPANY_USER" || uType === "COMPANY_ADMIN") && (
      pathname.startsWith("/recruiter") || 
      pathname === "/candidate" || 
      pathname.startsWith("/candidate/")
    )) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-2 ring-white ring-offset-2 ring-offset-indigo-600 outline-none transition-all"
      >
        Skip to main content
      </a>
      <Sidebar userType={sidebarUserType} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main
          id="main-content"
          tabIndex={-1}
          role="main"
          aria-label="Main Content"
          className="flex-1 overflow-y-auto bg-background p-6 outline-none"
        >
          {profileError && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">⚠️ Backend Service Notice:</span>
                <span>{profileError}. The backend API may be booting up or connecting.</span>
              </div>
              <button
                onClick={() => refreshProfile()}
                className="rounded bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
