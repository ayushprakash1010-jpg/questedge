"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export type PortalRole = "company" | "recruiter" | "candidate";

export const SIDEBAR_EXPANDED_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

const STORAGE_COLLAPSED_KEY = "questedge.sidebar.collapsed";
const STORAGE_SECTIONS_KEY = "questedge.sidebar.sections";

interface WorkspaceShellContextValue {
  userType: PortalRole;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
  isSectionCollapsed: (sectionTitle: string) => boolean;
  toggleSection: (sectionTitle: string) => void;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadCount: () => Promise<void>;
  hydrated: boolean;
}

const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(
  null
);

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('.monaco-editor, [contenteditable="true"]'));
}

export function WorkspaceShellProvider({
  userType,
  children,
}: {
  userType: PortalRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsedState] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted sidebar preferences safely after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const savedCollapsed = window.localStorage.getItem(STORAGE_COLLAPSED_KEY);
      if (savedCollapsed === "true") {
        setIsCollapsedState(true);
      }
      const savedSections = window.localStorage.getItem(STORAGE_SECTIONS_KEY);
      if (savedSections) {
        const parsed = JSON.parse(savedSections);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setCollapsedSections(parsed as Record<string, boolean>);
        }
      }
    } catch {
      // Ignore storage access errors (e.g. private browsing restrictions)
    } finally {
      setHydrated(true);
    }
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      window.localStorage.setItem(STORAGE_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const toggleMobileOpen = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const sectionKey = useCallback(
    (sectionTitle: string) => `${userType}:${sectionTitle}`,
    [userType]
  );

  const isSectionCollapsed = useCallback(
    (sectionTitle: string) => Boolean(collapsedSections[sectionKey(sectionTitle)]),
    [collapsedSections, sectionKey]
  );

  const toggleSection = useCallback(
    (sectionTitle: string) => {
      const key = sectionKey(sectionTitle);
      setCollapsedSections((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        try {
          window.localStorage.setItem(STORAGE_SECTIONS_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage write errors
        }
        return next;
      });
    },
    [sectionKey]
  );

  // Close mobile drawer automatically on route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Keyboard shortcuts: Cmd/Ctrl+B toggles sidebar (or mobile drawer below lg), Escape closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
        return;
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "b" &&
        !e.shiftKey &&
        !e.altKey &&
        !e.repeat
      ) {
        if (isEditableElement(e.target)) return;
        e.preventDefault();
        if (window.innerWidth < 1024) {
          toggleMobileOpen();
        } else {
          toggleCollapsed();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, toggleCollapsed, toggleMobileOpen]);

  // Single shared unread notifications poller for TopBar bell & Sidebar badge
  const refreshUnreadCount = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    try {
      const res = await fetch("/api/notifications?type=unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Number(data?.unreadCount) || 0);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
    const interval = setInterval(() => {
      void refreshUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  const value = useMemo<WorkspaceShellContextValue>(
    () => ({
      userType,
      isCollapsed,
      setCollapsed,
      toggleCollapsed,
      isMobileOpen,
      setMobileOpen: setIsMobileOpen,
      toggleMobileOpen,
      isSectionCollapsed,
      toggleSection,
      unreadCount,
      setUnreadCount,
      refreshUnreadCount,
      hydrated,
    }),
    [
      userType,
      isCollapsed,
      setCollapsed,
      toggleCollapsed,
      isMobileOpen,
      toggleMobileOpen,
      isSectionCollapsed,
      toggleSection,
      unreadCount,
      refreshUnreadCount,
      hydrated,
    ]
  );

  return (
    <WorkspaceShellContext.Provider value={value}>
      {children}
    </WorkspaceShellContext.Provider>
  );
}

export function useWorkspaceShell(): WorkspaceShellContextValue {
  const ctx = useContext(WorkspaceShellContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceShell must be used inside a WorkspaceShellProvider"
    );
  }
  return ctx;
}

export function useOptionalWorkspaceShell(): WorkspaceShellContextValue | null {
  return useContext(WorkspaceShellContext);
}
