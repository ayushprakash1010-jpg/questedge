"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Bell,
  Check,
  X,
  ArrowRight,
  Target,
  Briefcase,
  Gift,
  Clock,
  Sparkles,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?type=unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const url =
        filter === "UNREAD"
          ? "/api/notifications?unreadOnly=true&limit=15"
          : "/api/notifications?limit=15";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch {}
  }, [filter]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications?action=mark-all-read", { method: "POST" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) {
      fetch("/api/notifications?action=mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.actionUrl) {
      window.location.href = n.actionUrl;
      setOpen(false);
    }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getCategoryIcon = (type: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("REFERRAL") || t.includes("CONSENT")) {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Target className="h-4 w-4" />
        </div>
      );
    }
    if (t.includes("MANDATE")) {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <Briefcase className="h-4 w-4" />
        </div>
      );
    }
    if (t.includes("REWARD")) {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
          <Gift className="h-4 w-4" />
        </div>
      );
    }
    if (t.includes("CLAIM")) {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <Clock className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Bell className="h-4 w-4" />
      </div>
    );
  };

  // Handle Escape key to close popover
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            aria-atomic="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
            <span className="sr-only">unread notifications</span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="region"
            aria-label="Notification inbox"
            className="absolute right-0 z-50 mt-2 w-88 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div role="tablist" aria-label="Notification filter" className="flex border-b border-slate-100 px-4 py-1.5 bg-white gap-2">
              <button
                role="tab"
                aria-selected={filter === "ALL"}
                onClick={() => setFilter("ALL")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
                  filter === "ALL"
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                All
              </button>
              <button
                role="tab"
                aria-selected={filter === "UNREAD"}
                onClick={() => setFilter("UNREAD")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
                  filter === "UNREAD"
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Unread only
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">You're all caught up!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No notifications to display</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-50/80",
                      !n.read ? "bg-indigo-50/30" : "bg-white"
                    )}
                  >
                    {getCategoryIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={cn(
                            "text-xs leading-snug truncate",
                            !n.read ? "font-bold text-slate-900" : "font-medium text-slate-700"
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-2.5 bg-slate-50 text-center">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View full notification center
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
