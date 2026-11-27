"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Users,
  ClipboardList,
  X,
  ArrowRight,
  PanelLeft,
  Moon,
  Sun,
  Compass,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPortalNavSections, NavItem } from "@/components/sidebar";
import {
  PortalRole,
  useOptionalWorkspaceShell,
} from "@/components/workspace-shell-context";
import { useProfile } from "@/hooks/use-profile";

interface SearchResults {
  candidates: { id: string; name: string; email: string; currentRole: string | null }[];
  hiringPlans: { id: string; title: string; department: string; status: string }[];
}

interface PaletteEntry {
  id: string;
  group: string;
  label: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ElementType;
  action: () => void;
}

export function GlobalSearch({ userType = "company" }: { userType?: PortalRole }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const shell = useOptionalWorkspaceShell();
  const { profile } = useProfile();
  const effectiveUserType: PortalRole = shell?.userType ?? userType;

  const closeModal = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
      closeModal();
    },
    [router, closeModal]
  );

  // Cmd/Ctrl+K shortcut (works across Company, Recruiter, and Candidate portals)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeModal]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const search = useCallback(
    async (q: string) => {
      if (userType !== "company" || q.trim().length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setResults(await res.json());
      } catch {
        // Ignore transient search failures
      } finally {
        setLoading(false);
      }
    },
    [userType]
  );

  const handleInput = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (userType === "company") {
      debounceRef.current = setTimeout(() => search(value), 250);
    }
  };

  // Filtered quick-jump pages for current portal + workspace commands
  const navEntries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const sections = getPortalNavSections(effectiveUserType);
    const entries: PaletteEntry[] = [];

    sections.forEach((section) => {
      section.items.forEach((item: NavItem) => {
        if (
          effectiveUserType === "company" &&
          profile?.role &&
          item.roles?.length &&
          !item.roles.includes(profile.role)
        ) {
          return;
        }
        const haystack = [
          item.label,
          section.title || "",
          item.href,
          ...(item.keywords || []),
        ]
          .join(" ")
          .toLowerCase();

        if (!q || haystack.includes(q)) {
          entries.push({
            id: `nav:${item.href}`,
            group: section.title || "Pages",
            label: item.label,
            subtitle: section.title ? `Go to ${section.title}` : undefined,
            icon: item.icon,
            action: () => navigate(item.href),
          });
        }
      });
    });

    // Quick workspace actions
    if (shell) {
      const toggleText = shell.isCollapsed
        ? "Expand Sidebar"
        : "Collapse Sidebar";
      if (!q || `${toggleText} sidebar menu rail`.toLowerCase().includes(q)) {
        entries.push({
          id: "cmd:toggle-sidebar",
          group: "Workspace Actions",
          label: toggleText,
          subtitle: "Switch between full and compact icon rail",
          shortcut: "⌘B",
          icon: PanelLeft,
          action: () => {
            shell.toggleCollapsed();
            closeModal();
          },
        });
      }

      const peekText = shell.autoPeek
        ? "Disable Hover-to-Peek Sidebar"
        : "Enable Hover-to-Peek Sidebar";
      if (!q || `${peekText} hover peek auto expand`.toLowerCase().includes(q)) {
        entries.push({
          id: "cmd:toggle-peek",
          group: "Workspace Actions",
          label: peekText,
          subtitle: "Auto-expand shrunk sidebar cleanly on hover",
          icon: Eye,
          action: () => {
            shell.toggleAutoPeek();
            closeModal();
          },
        });
      }
    }

    const nextThemeLabel =
      resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
    if (!q || `${nextThemeLabel} theme appearance`.toLowerCase().includes(q)) {
      entries.push({
        id: "cmd:toggle-theme",
        group: "Workspace Actions",
        label: nextThemeLabel,
        subtitle: "Toggle interface appearance",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        action: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          closeModal();
        },
      });
    }

    return q ? entries : entries.slice(0, 8);
  }, [query, effectiveUserType, profile?.role, shell, resolvedTheme, setTheme, navigate, closeModal]);

  const allSelectableEntries = useMemo<PaletteEntry[]>(() => {
    const items: PaletteEntry[] = [];

    if (effectiveUserType === "company" && results) {
      results.candidates.forEach((c) => {
        items.push({
          id: `cand:${c.id}`,
          group: "Candidates",
          label: c.name,
          subtitle: `${c.email}${c.currentRole ? ` · ${c.currentRole}` : ""}`,
          icon: Users,
          action: () =>
            navigate(`/candidates?q=${encodeURIComponent(c.email || c.name)}`),
        });
      });
      results.hiringPlans.forEach((p) => {
        items.push({
          id: `plan:${p.id}`,
          group: "Hiring Plans",
          label: p.title,
          subtitle: `${p.department} · ${p.status}`,
          icon: ClipboardList,
          action: () => navigate(`/hiring-plans/${p.id}`),
        });
      });
    }

    if (userType !== "company" && query.trim().length >= 2) {
      const boardHref =
        userType === "recruiter" ? "/recruiter/discover" : "/candidate/jobs";
      const boardLabel =
        userType === "recruiter" ? "Browse Mandates" : "Browse Open Jobs";
      items.push({
        id: "board:search",
        group: "Marketplace",
        label: boardLabel,
        subtitle: `Open job discovery board`,
        icon: Compass,
        action: () => navigate(boardHref),
      });
    }

    items.push(...navEntries);
    return items;
  }, [userType, results, query, navEntries, navigate]);

  const groupedEntries = useMemo(() => {
    const map = new Map<string, { item: PaletteEntry; flatIdx: number }[]>();
    allSelectableEntries.forEach((item, idx) => {
      const existing = map.get(item.group) || [];
      existing.push({ item, flatIdx: idx });
      map.set(item.group, existing);
    });
    return Array.from(map.entries());
  }, [allSelectableEntries]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && modalRef.current) {
      const focusables = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
          return;
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
          return;
        }
      }
    }
    if (allSelectableEntries.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % allSelectableEntries.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + allSelectableEntries.length) % allSelectableEntries.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      allSelectableEntries[activeIndex]?.action();
    }
  };

  const triggerLabel =
    userType === "company"
      ? "Search or jump..."
      : userType === "recruiter"
      ? "Jump or search mandates..."
      : "Jump or browse jobs...";

  const inputPlaceholder =
    userType === "company"
      ? "Search candidates, plans, or jump to page..."
      : "Jump to any page, tool, or action...";

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{triggerLabel}</span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 sm:inline dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={closeModal}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quick command palette"
            onKeyDown={handleModalKeyDown}
            className="fixed inset-x-4 top-[14%] z-50 mx-auto max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                aria-controls="global-search-listbox"
                aria-activedescendant={allSelectableEntries[activeIndex] ? `gs-opt-${allSelectableEntries[activeIndex].id}` : undefined}
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder={inputPlaceholder}
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close search"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div
              id="global-search-listbox"
              role="listbox"
              aria-label="Search results"
              className="max-h-80 overflow-y-auto p-2 scrollbar-thin"
            >
              {loading && (
                <div className="py-4 text-center text-xs text-slate-400">
                  Searching workspace...
                </div>
              )}

              {!loading && groupedEntries.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  No matching pages or records found
                </div>
              )}

              {groupedEntries.map(([groupName, items]) => (
                <div key={groupName} className="mb-2 last:mb-0">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {groupName}
                  </p>
                  {items.map(({ item, flatIdx }) => {
                    const isSelected = flatIdx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        id={`gs-opt-${item.id}`}
                        role="option"
                        aria-selected={isSelected}
                        type="button"
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={item.action}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isSelected
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-400"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.label}</p>
                            {item.subtitle && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.shortcut ? (
                          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.shortcut}
                          </kbd>
                        ) : (
                          <ArrowRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-500">
              <span>↑↓ Navigate · ↵ Open · Esc Close</span>
              <span>⌘B Toggle Sidebar</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
