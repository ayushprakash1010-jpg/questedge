"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import {
  LogOut,
  User,
  Settings,
  ChevronDown,
  Moon,
  Sun,
  RefreshCw,
  Shield,
  ExternalLink,
  Briefcase,
  Building2,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { useProfile } from "@/hooks/use-profile";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
const SUPPORT_ADMIN_URL =
  process.env.NEXT_PUBLIC_SUPPORT_ADMIN_URL || "https://questedge-support-admin.vercel.app";

export function TopBar() {
  const { user } = useUser();
  const { profile } = useProfile();

  const displayName = IS_MOCK ? "Priya Sharma" : user?.name;
  const displayPicture = IS_MOCK ? undefined : user?.picture || undefined;
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isRecruiter = pathname?.startsWith("/recruiter");
  const isCandidate = pathname === "/candidate" || pathname?.startsWith("/candidate");
  const isCompany = !isRecruiter && !isCandidate;

  const isDemo =
    Boolean((profile as any)?.isDemoAccount) ||
    user?.email?.toLowerCase() === "growytvercel@gmail.com" ||
    user?.name?.toLowerCase() === "growytvercel@gmail.com" ||
    displayName?.toLowerCase() === "growytvercel@gmail.com";

  const isSuperAdmin =
    profile?.role === "SUPPORT_ADMIN" ||
    (profile as any)?.userType === "PLATFORM_ADMIN";

  const isCompanyAdmin =
    profile?.role === "ADMIN" ||
    (profile as any)?.userType === "COMPANY_ADMIN";

  const profileHref =
    isRecruiter || (profile as any)?.userType === "RECRUITER"
      ? "/recruiter/profile"
      : isCandidate || (profile as any)?.userType === "CANDIDATE"
      ? "/candidate/profile"
      : "/profile";

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleRoleSwitch = (targetRole: "COMPANY" | "RECRUITER" | "CANDIDATE") => {
    document.cookie = `demo_role=${targetRole}; path=/; max-age=86400; SameSite=Lax`;
    if (targetRole === "COMPANY") {
      window.location.href = "/dashboard";
    } else if (targetRole === "RECRUITER") {
      window.location.href = "/recruiter/dashboard";
    } else if (targetRole === "CANDIDATE") {
      window.location.href = "/candidate/dashboard";
    }
  };

  return (
    <header
      className="flex items-center justify-between border-b border-slate-200/60 bg-white px-6"
      style={{ height: "var(--topbar-height)" }}
    >
      <GlobalSearch />

      <div className="flex items-center gap-3">
        {/* Demo Account Role Switcher segmented pill buttons */}
        {isDemo && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => handleRoleSwitch("COMPANY")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                isCompany
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Switch to Company View"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Company</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("RECRUITER")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                isRecruiter
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Switch to Recruiter View"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Recruiter</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("CANDIDATE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                isCandidate
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Switch to Candidate View"
            >
              <UserCircle className="h-3.5 w-3.5" />
              <span>Candidate</span>
            </button>
          </div>
        )}

        {/* Support Admin Cross-Portal Switcher */}
        {isSuperAdmin && (
          <a
            href={SUPPORT_ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-xs dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
            title="Switch to QuestEdge Support Admin Portal"
          >
            <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Support Admin</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
            <Avatar size="sm">
              <AvatarImage src={displayPicture} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-slate-700 md:inline">
              {displayName}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-[208px]">
            <DropdownMenuItem onClick={() => (window.location.href = profileHref)}>
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            {isCompanyAdmin && (
              <DropdownMenuItem onClick={() => (window.location.href = "/admin")}>
                <Settings className="h-4 w-4" /> Admin
              </DropdownMenuItem>
            )}
            {isSuperAdmin && (
              <DropdownMenuItem onClick={() => window.open(SUPPORT_ADMIN_URL, "_blank")}>
                <Shield className="h-4 w-4 text-indigo-600" /> Support Admin Portal
              </DropdownMenuItem>
            )}

            {isDemo && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Demo Role
                </div>
                <DropdownMenuItem onClick={() => handleRoleSwitch("COMPANY")}>
                  <Building2 className="h-4 w-4 text-indigo-500" /> Switch to Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleSwitch("RECRUITER")}>
                  <Briefcase className="h-4 w-4 text-purple-500" /> Switch to Recruiter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleSwitch("CANDIDATE")}>
                  <UserCircle className="h-4 w-4 text-emerald-500" /> Switch to Candidate
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={async () => {
                if (IS_MOCK) return window.location.href = "/onboarding";
                const confirm = window.confirm("Are you sure you want to reset your account role? You will be redirected to onboarding.");
                if (!confirm) return;
                
                try {
                  const res = await fetch("/api/auth/reset-role", { method: "POST" });
                  if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || "Cannot change role right now. You might have active associations.");
                    return;
                  }
                  window.location.href = "/onboarding"; // Hard reload to clear session claims cache
                } catch (err) {
                  alert("Failed to reset role.");
                }
              }}
            >
              <RefreshCw className="h-4 w-4" /> Change Role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              onClick={() =>
                (window.location.href = IS_MOCK ? "/dashboard" : "/auth/logout")
              }
            >
              <LogOut className="h-4 w-4" /> {IS_MOCK ? "Mock Mode" : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
