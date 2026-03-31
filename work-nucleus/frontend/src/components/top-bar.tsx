"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function TopBar() {
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="flex h-16 items-center justify-between border-b border-slate-200/60 bg-white px-6">
      <GlobalSearch />

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={displayPicture} />
              <AvatarFallback className="bg-indigo-100 text-xs font-semibold text-indigo-700">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-slate-700 hidden md:inline">
              {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200/60 bg-white py-1.5 shadow-lg z-50">
              <a
                href="/profile"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <User className="h-4 w-4" /> Profile
              </a>
              <a
                href="/admin"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" /> Admin
              </a>
              <hr className="my-1.5 border-slate-100" />
              <a
                href={IS_MOCK ? "/dashboard" : "/auth/logout"}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> {IS_MOCK ? "Mock Mode" : "Logout"}
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
