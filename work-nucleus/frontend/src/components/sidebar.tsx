"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      { label: "My Referrals", href: "/recruiter/referrals", icon: Users },
      { label: "Leaderboard", href: "/recruiter/leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Earnings", href: "/recruiter/earnings", icon: IndianRupee },
      { label: "Profile", href: "/recruiter/profile", icon: UserCircle },
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
      { label: "Saved Jobs", href: "/candidate/jobs?saved=true", icon: Heart },
      { label: "My Applications", href: "/candidate/referrals", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/candidate/profile", icon: UserCircle },
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
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${logoGradient} shadow-[0_2px_6px_rgba(0,0,0,0.15)]`}
          >
            <span className="text-sm font-extrabold text-white">Q</span>
          </div>
          <span className="text-base font-bold text-slate-900">
            Quest<span className={config.accent}>Edge</span>
          </span>
        </Link>
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

      {/* Role badge */}
      <div className="p-3 border-t border-slate-100">
        <div
          className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${
            userType === "recruiter"
              ? "bg-sky-50 text-sky-600"
              : userType === "candidate"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {userType} view
        </div>
      </div>
    </aside>
  );
}
