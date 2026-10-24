"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Ticket,
  BarChart3,
  Wrench,
  Headset,
  LogOut,
  Users,
  Store,
  Bot,
  Shield,
  HeartPulse,
  FileText,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ label: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Organization",
    items: [
      { label: "Organizations", href: "/organizations", icon: Building2 },
      { label: "Users", href: "/users", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Tickets", href: "/tickets", icon: Ticket },
      { label: "Marketplace", href: "/marketplace", icon: Store },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "AI Operations", href: "/ai-operations", icon: Bot, adminOnly: true },
      { label: "Metrics", href: "/metrics", icon: BarChart3 },
      { label: "Security", href: "/security", icon: Shield, adminOnly: true },
      { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, adminOnly: true },
      { label: "Tools", href: "/tools", icon: Wrench },
      { label: "System Health", href: "/system-health", icon: HeartPulse, adminOnly: true },
    ],
  },
];

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3001";

export function SupportSidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const isAdmin = profile?.role === "SUPPORT_ADMIN";

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <Headset className="h-5 w-5 text-primary" />
          <span className="text-xl font-bold">QuestEdge Admin</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label ?? "root"}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t p-4">
        {profile && (
          <div className="mb-3 px-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground truncate">{profile.name}</p>
            <p className="truncate">{profile.role}</p>
          </div>
        )}
        <a
          href={MAIN_APP_URL}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to Main App
        </a>
        <a
          href="/auth/logout"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-500"
        >
          <LogOut className="h-3 w-3" />
          Sign Out
        </a>
      </div>
    </aside>
  );
}

