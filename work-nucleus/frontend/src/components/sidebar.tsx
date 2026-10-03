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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

// ── Navigation config per user type ─────────────────────────────

const companyNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mandates", href: "/mandates", icon: Briefcase },
  { label: "Candidates", href: "/candidates", icon: Users },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Admin", href: "/admin/users", icon: Shield },
];

const recruiterNav: NavItem[] = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Discover Jobs", href: "/recruiter/discover", icon: Compass },
  { label: "My Referrals", href: "/recruiter/referrals", icon: Users },
  { label: "Earnings", href: "/recruiter/earnings", icon: IndianRupee },
  { label: "Profile", href: "/recruiter/profile", icon: UserCircle },
];

const candidateNav: NavItem[] = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Browse Jobs", href: "/candidate/jobs", icon: Compass },
  { label: "Saved Jobs", href: "/candidate/jobs?saved=true", icon: Heart },
  { label: "My Referrals", href: "/candidate/referrals", icon: Users },
  { label: "Profile", href: "/candidate/profile", icon: UserCircle },
];

// ── Color accent per role ────────────────────────────────────────

const roleConfig = {
  company: {
    nav: companyNav,
    accent: "text-indigo-600",
    activeBg: "bg-indigo-50 text-indigo-700",
    logoGradient: "from-indigo-500 to-violet-600",
  },
  recruiter: {
    nav: recruiterNav,
    accent: "text-sky-600",
    activeBg: "bg-sky-50 text-sky-700",
    logoGradient: "from-sky-500 to-cyan-600",
  },
  candidate: {
    nav: candidateNav,
    accent: "text-emerald-600",
    activeBg: "bg-emerald-50 text-emerald-700",
    logoGradient: "from-emerald-500 to-teal-600",
  },
};

interface SidebarProps {
  userType?: "company" | "recruiter" | "candidate";
}

export function Sidebar({ userType = "company" }: SidebarProps) {
  const pathname = usePathname();
  const config = roleConfig[userType] ?? roleConfig.company;
  const { nav, activeBg, logoGradient } = config;

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
            <span className="text-sm font-extrabold text-white">R</span>
          </div>
          <span className="text-base font-bold text-slate-900">
            Referral<span className={config.accent}>Hire</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-px overflow-y-auto p-2.5">
        {nav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? activeBg
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? config.accent : ""
                )}
              />
              {item.label}
            </Link>
          );
        })}
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
