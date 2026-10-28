"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  Target,
  Briefcase,
  Gift,
  Clock,
  ArrowRight,
  Filter,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { MarketplaceEmptyState } from "@/components/ui/marketplace-empty-state";
import { ErrorBanner } from "@/components/ui/error-state";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  createdAt: string;
}

const CATEGORY_TABS = [
  { id: "ALL", label: "All Notifications" },
  { id: "UNREAD", label: "Unread" },
  { id: "REFERRALS", label: "Referrals & Consents" },
  { id: "MANDATES", label: "Mandates & Pipeline" },
  { id: "REWARDS", label: "Rewards & Escrow" },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");

      if (activeTab === "UNREAD") {
        params.set("unreadOnly", "true");
      } else if (activeTab !== "ALL") {
        params.set("category", activeTab);
      }

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load notifications (${res.status})`);
      }
      const data = await res.json();
      setNotifications(data.data || []);
      if (data.meta) {
        setTotalPages(data.meta.totalPages || 1);
        setTotalItems(data.meta.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err?.message || "Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications?action=mark-all-read", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch("/api/notifications?action=mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleItemClick = (n: NotificationItem) => {
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
    }
  };

  const getCategoryDetails = (type: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("REFERRAL") || t.includes("CONSENT")) {
      return {
        label: "Referral",
        icon: Target,
        badgeBg: "bg-violet-50 text-violet-700 border-violet-200",
        iconBg: "bg-violet-100 text-violet-600",
      };
    }
    if (t.includes("MANDATE")) {
      return {
        label: "Mandate",
        icon: Briefcase,
        badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        iconBg: "bg-indigo-100 text-indigo-600",
      };
    }
    if (t.includes("REWARD")) {
      return {
        label: "Reward",
        icon: Gift,
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-600",
      };
    }
    if (t.includes("CLAIM")) {
      return {
        label: "Claim Scope",
        icon: Clock,
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        iconBg: "bg-amber-100 text-amber-600",
      };
    }
    return {
      label: "System",
      icon: Bell,
      badgeBg: "bg-slate-50 text-slate-700 border-slate-200",
      iconBg: "bg-slate-100 text-slate-600",
    };
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Notification Center
              </h1>
              <p className="text-sm text-slate-500">
                Live activity feed for mandates, candidate referral consents, and bounty rewards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 text-indigo-600" />
              Mark all read ({unreadCount})
            </button>
          )}

          <button
            onClick={() => {
              fetchNotifications();
              fetchUnreadCount();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-indigo-600")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-xl transition-all",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              {tab.label}
              {tab.id === "UNREAD" && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={fetchNotifications}
          onReset={() => {
            setActiveTab("ALL");
            setPage(1);
          }}
        />
      )}

      {/* Notification Stream */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 w-full rounded-2xl bg-white border border-slate-200 p-4 animate-pulse flex items-start gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <MarketplaceEmptyState
          preset="notifications"
          title={activeTab === "UNREAD" ? "No Unread Notifications" : "All Caught Up!"}
          description={
            activeTab === "UNREAD"
              ? "You have zero unread notifications. New alerts will show up here as candidates advance."
              : "No activity records found in this category. Check back later or review your active mandates."
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const cat = getCategoryDetails(n.type);
            const Icon = cat.icon;

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={cn(
                  "group relative flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
                  !n.read
                    ? "bg-white border-indigo-200 hover:border-indigo-300 hover:shadow-md ring-1 ring-indigo-50"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                )}
              >
                {/* Unread pulse dot */}
                {!n.read && (
                  <div className="absolute top-5 right-5 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span className="text-[10px] font-semibold text-indigo-600">New</span>
                  </div>
                )}

                {/* Category Icon */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", cat.iconBg)}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", cat.badgeBg)}>
                      {cat.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTimestamp(n.createdAt)}
                    </span>
                  </div>

                  <h4
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      !n.read ? "text-slate-900 font-bold" : "text-slate-800"
                    )}
                  >
                    {n.title}
                  </h4>

                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {n.body}
                  </p>

                  {/* Actions Bar */}
                  <div className="mt-3 flex items-center gap-4">
                    {n.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                        View details
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}

                    {!n.read && (
                      <button
                        onClick={(e) => handleMarkRead(n.id, e)}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalPages}</span> ({totalItems} total)
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
