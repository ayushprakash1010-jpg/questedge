"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function SupportTopBar() {
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

  const displayName = IS_MOCK ? "Support Admin" : user?.name;
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
    <header className="flex h-16 items-center justify-end border-b bg-card px-6">
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayPicture} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">
            {displayName}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-card py-1 shadow-lg z-50">
            <a
              href={IS_MOCK ? "/" : "/auth/logout"}
              className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {IS_MOCK ? "Mock Mode" : "Logout"}
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
