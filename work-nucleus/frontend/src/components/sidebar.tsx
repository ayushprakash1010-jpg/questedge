"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  GraduationCap,
  Shield,
  FileText,
  ShieldCheck,
  Award,
  IndianRupee,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Hiring Plans", href: "/hiring-plans", icon: ClipboardList },
  { label: "Candidates", href: "/candidates", icon: Users },
  { label: "Offers", href: "/offers", icon: FileText, roles: ["ADMIN", "HR", "HIRING_MANAGER"] },
  { label: "BGV", href: "/bgv", icon: ShieldCheck, roles: ["ADMIN", "HR"] },
  { label: "Appraisal", href: "/appraisal", icon: Award },
  { label: "Compensation", href: "/compensation/team", icon: IndianRupee, roles: ["ADMIN", "HR", "HIRING_MANAGER"] },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, roles: ["ADMIN", "HR"] },
  { label: "Training", href: "/training", icon: GraduationCap },
  { label: "Admin", href: "/admin/users", icon: Shield, roles: ["ADMIN"] },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  return (
    <aside
      className="flex h-full flex-col border-r border-slate-200/60 bg-white"
      style={{ width: "var(--sidebar-width)" }}
    >
      <div
        className="flex items-center border-b border-slate-200/60 px-5"
        style={{ height: "var(--topbar-height)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-[0_2px_6px_rgba(79,70,229,0.3)]">
            <span className="text-sm font-extrabold text-white">W</span>
          </div>
          <span className="text-base font-bold text-slate-900">
            Work<span className="text-indigo-600">Nucleus</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-px overflow-y-auto p-2.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-indigo-600" : ""
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
