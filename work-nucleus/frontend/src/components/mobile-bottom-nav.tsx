"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Trophy,
  Compass,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roleConfig } from "@/components/sidebar";
import {
  PortalRole,
  useOptionalWorkspaceShell,
} from "@/components/workspace-shell-context";

interface QuickTab {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

const MOBILE_TABS: Record<PortalRole, QuickTab[]> = {
  company: [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true },
    { label: "Mandates", href: "/mandates", icon: Briefcase },
    { label: "Candidates", href: "/candidates", icon: Users },
    { label: "Ranker", href: "/resume-ranker", icon: Trophy },
  ],
  recruiter: [
    { label: "Home", href: "/recruiter/dashboard", icon: LayoutDashboard, exact: true },
    { label: "Discover", href: "/recruiter/discover", icon: Compass },
    { label: "Referrals", href: "/recruiter/referrals", icon: Users },
    { label: "Earnings", href: "/recruiter/earnings", icon: IndianRupee },
  ],
  candidate: [
    { label: "Home", href: "/candidate/dashboard", icon: LayoutDashboard, exact: true },
    { label: "Jobs", href: "/candidate/jobs", icon: Compass },
    { label: "Applied", href: "/candidate/applications", icon: Briefcase },
    { label: "Requests", href: "/candidate/referrals", icon: Users },
  ],
};

export function MobileBottomNav({ userType = "company" }: { userType?: PortalRole }) {
  const pathname = usePathname();
  const shell = useOptionalWorkspaceShell();
  const effectiveRole: PortalRole = shell?.userType ?? userType;
  const tabs = MOBILE_TABS[effectiveRole] ?? MOBILE_TABS.company;
  const config = roleConfig[effectiveRole] ?? roleConfig.company;
  const actionBadges = shell?.actionBadges ?? {};

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 md:hidden print:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid h-16 grid-cols-4">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const count = actionBadges[tab.href] || 0;
          const badgeTone =
            tab.href === "/candidate/referrals"
              ? "bg-amber-500 text-white"
              : config.badgeStyle;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                isActive
                  ? config.accent
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 h-[2.5px] w-8 rounded-b-full",
                    config.activeBar
                  )}
                />
              )}
              <span className="relative flex items-center justify-center">
                <tab.icon className="h-[18px] w-[18px]" />
                {count > 0 && (
                  <span
                    className={cn(
                      "absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-2xs",
                      badgeTone
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span className="truncate leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
