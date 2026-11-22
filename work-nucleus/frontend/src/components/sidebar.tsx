"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuestEdgeLogo } from "@/components/QuestEdgeLogo";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Compass,
  IndianRupee,
  BarChart3,
  Shield,
  UserCircle,
  Heart,
  FileText,
  LifeBuoy,
  Trophy,
  Star,
  ShieldCheck,
  Wallet,
  Bell,
  Code2,
  Globe,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ── Navigation config per user type with organized section labels ────────

const companyNavSections: NavSection[] = [
  {
    title: "Recruiting",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Mandates", href: "/mandates", icon: Briefcase },
      { label: "Candidates", href: "/candidates", icon: Users },
      { label: "Assessments", href: "/assessments", icon: Code2 },
      { label: "Resume Ranker", href: "/resume-ranker", icon: Trophy },
    ],
  },
  {
    title: "HR & Operations",
    items: [
      { label: "Appraisals", href: "/appraisal", icon: Star },
      { label: "BGV Verification", href: "/bgv", icon: ShieldCheck },
      { label: "Compensation", href: "/compensation/team", icon: Wallet },
      { label: "Billing & Escrow", href: "/company/financials", icon: IndianRupee },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Admin Settings", href: "/admin/users", icon: Shield },
      { label: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

const recruiterNavSections: NavSection[] = [
  {
    title: "Sourcing",
    items: [
      { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
      { label: "Discover Jobs", href: "/recruiter/discover", icon: Compass },
      { label: "Explore Market", href: "/recruiter/external-jobs", icon: Globe },
      { label: "My Referrals", href: "/recruiter/referrals", icon: Users },
      { label: "Leaderboard", href: "/recruiter/leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Applications",
    items: [
      { label: "My Applications", href: "/recruiter/applications", icon: Briefcase },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Earnings", href: "/recruiter/earnings", icon: IndianRupee },
      { label: "Profile & Resume", href: "/recruiter/profile", icon: UserCircle },
      { label: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

const candidateNavSections: NavSection[] = [
  {
    title: "Opportunities",
    items: [
      { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
      { label: "Browse Jobs", href: "/candidate/jobs", icon: Compass },
      ...(process.env.NEXT_PUBLIC_FEATURE_EXTERNAL_JOBS === "true"
        ? [{ label: "Explore Market", href: "/candidate/external-jobs", icon: Globe }]
        : []),
      { label: "Saved Jobs", href: "/candidate/jobs?saved=true", icon: Heart },
      { label: "My Applications", href: "/candidate/applications", icon: Briefcase },
      { label: "Referral Requests", href: "/candidate/referrals", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Profile", href: "/candidate/profile", icon: UserCircle },
      { label: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

// ── Color accent per role ────────────────────────────────────────

const roleConfig = {
  company: {
    sections: companyNavSections,
    accent: "text-indigo-600",
    activeBg: "bg-indigo-50 text-indigo-700 font-semibold",
    logoGradient: "from-indigo-500 to-violet-600",
  },
  recruiter: {
    sections: recruiterNavSections,
    accent: "text-sky-600",
    activeBg: "bg-sky-50 text-sky-700 font-semibold",
    logoGradient: "from-sky-500 to-cyan-600",
  },
  candidate: {
    sections: candidateNavSections,
    accent: "text-emerald-600",
    activeBg: "bg-emerald-50 text-emerald-700 font-semibold",
    logoGradient: "from-emerald-500 to-teal-600",
  },
};

interface SidebarProps {
  userType?: "company" | "recruiter" | "candidate";
}

export function Sidebar({ userType = "company" }: SidebarProps) {
  const pathname = usePathname();
  const config = roleConfig[userType] ?? roleConfig.company;
  const { sections, activeBg, logoGradient } = config;

  const homeHref =
    userType === "recruiter"
      ? "/recruiter/dashboard"
      : userType === "candidate"
      ? "/candidate/dashboard"
      : "/dashboard";

  return (
    <aside
      className="flex h-full flex-col border-r border-slate-200/60 bg-white"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center border-b border-slate-200/60 px-5"
        style={{ height: "var(--topbar-height)" }}
      >
        <QuestEdgeLogo href={homeHref} size="md" priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {sections.map((section, sIdx) => (
          <div key={section.title || sIdx} className="space-y-1">
            {section.title && (
              <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/recruiter/dashboard" &&
                    item.href !== "/candidate/dashboard" &&
                    pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? activeBg
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? config.accent : "text-slate-400"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Role Workspace Card */}
      <div className="p-3 border-t border-slate-200/70 bg-slate-50/40">
        <Link
          href={
            userType === "recruiter"
              ? "/recruiter/profile"
              : userType === "candidate"
              ? "/candidate/profile"
              : "/admin/settings"
          }
          className={cn(
            "group flex items-center justify-between rounded-xl border p-2.5 transition-all duration-200 shadow-2xs hover:shadow-xs",
            userType === "recruiter"
              ? "border-sky-200/90 bg-gradient-to-r from-sky-50/90 via-sky-50/60 to-cyan-50/40 hover:border-sky-300"
              : userType === "candidate"
              ? "border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-emerald-50/60 to-teal-50/40 hover:border-emerald-300"
              : "border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-indigo-50/60 to-purple-50/40 hover:border-indigo-300"
          )}
          title={`View ${userType} profile and settings`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-xs transition-transform group-hover:scale-105",
                userType === "recruiter"
                  ? "bg-gradient-to-br from-sky-500 to-cyan-600"
                  : userType === "candidate"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-indigo-500 to-purple-600"
              )}
            >
              {userType === "recruiter" ? (
                <Compass className="h-4 w-4" />
              ) : userType === "candidate" ? (
                <UserCircle className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold uppercase tracking-wide text-slate-900">
                  {userType === "recruiter"
                    ? "Recruiter Portal"
                    : userType === "candidate"
                    ? "Candidate Portal"
                    : "Company Portal"}
                </span>
              </div>
              <p className="truncate text-[10px] font-medium text-slate-500">
                {userType === "recruiter"
                  ? "Sourcing & Direct Apply"
                  : userType === "candidate"
                  ? "Applications & Matches"
                  : "Hiring & Talent Pipeline"}
              </p>
            </div>
          </div>

          <div className="flex items-center pl-1 shrink-0" title="Active workspace">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  userType === "recruiter"
                    ? "bg-sky-400"
                    : userType === "candidate"
                    ? "bg-emerald-400"
                    : "bg-indigo-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  userType === "recruiter"
                    ? "bg-sky-500"
                    : userType === "candidate"
                    ? "bg-emerald-500"
                    : "bg-indigo-500"
                )}
              />
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
