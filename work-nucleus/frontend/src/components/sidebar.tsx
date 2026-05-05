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
    <aside className="flex h-full w-64 flex-col border-r border-slate-200/60 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200/60 px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm">
            <span className="text-sm font-bold text-white">W</span>
          </div>
          <span className="text-lg font-bold text-slate-900">Work Nucleus</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", isActive ? "text-indigo-600" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200/60 p-3">
        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-cyan-50 p-3">
          <p className="text-xs font-semibold text-indigo-900">Nova Design</p>
          <p className="mt-0.5 text-[10px] text-indigo-600">Powered by Nova DS</p>
        </div>
      </div>
    </aside>
  );
}
