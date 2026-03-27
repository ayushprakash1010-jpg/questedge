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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Organizations", href: "/organizations", icon: Building2 },
  { label: "Tickets", href: "/tickets", icon: Ticket },
  { label: "Metrics", href: "/metrics", icon: BarChart3 },
  { label: "Tools", href: "/tools", icon: Wrench },
];

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3001";

export function SupportSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <Headset className="h-5 w-5 text-primary" />
          <span className="text-xl font-bold">Support Portal</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
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
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t p-4">
        <a
          href={MAIN_APP_URL}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Main App
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
