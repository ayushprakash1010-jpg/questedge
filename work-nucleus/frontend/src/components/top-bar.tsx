"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
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

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function TopBar() {
  const { user } = useUser();

  const displayName = IS_MOCK ? "Priya Sharma" : user?.name;
  const displayPicture = IS_MOCK ? undefined : user?.picture || undefined;

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header
      className="flex items-center justify-between border-b border-slate-200/60 bg-white px-6"
      style={{ height: "var(--topbar-height)" }}
    >
      <GlobalSearch />

      <div className="flex items-center gap-3">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50">
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
            <DropdownMenuItem onClick={() => (window.location.href = "/profile")}>
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (window.location.href = "/admin")}>
              <Settings className="h-4 w-4" /> Admin
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
