"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationsAsRead,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const res = await getUnreadNotificationsCount(accessToken);
      setUnreadCount(res.unreadCount);
    } catch (e) {}
  };

  const fetchRecent = async () => {
    try {
      setLoading(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const res = await getNotifications(accessToken);
      setNotifications(res.data || []);
      
      // Mark as read immediately when opened
      const unreadIds = (res.data || []).filter((n: any) => !n.read).map((n: any) => n.id);
      if (unreadIds.length > 0) {
        await markNotificationsAsRead(accessToken, unreadIds);
        setUnreadCount(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      fetchRecent();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.slice(0, 8).map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors",
                      !notif.read && "bg-sky-50/50"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.body}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
            <button className="text-xs text-sky-600 font-medium hover:text-sky-700">View all activity</button>
          </div>
        </div>
      )}
    </div>
  );
}
