"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { QuestEdgeLogo } from "@/components/QuestEdgeLogo";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Compass,
  IndianRupee,
  BarChart3,
  Shield,
  UserCircle,
  Heart,
  LifeBuoy,
  Trophy,
  Star,
  ShieldCheck,
  Wallet,
  Bell,
  Code2,
  Globe,
  Building2,
  ChevronLeft,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PortalRole,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  useOptionalWorkspaceShell,
} from "@/components/workspace-shell-context";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ── Navigation config per user type with organized section labels ────────

const companyNavSections: NavSection[] = [
  {
    title: "Recruiting",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["overview", "analytics", "home"] },
      { label: "Mandates", href: "/mandates", icon: Briefcase, keywords: ["jobs", "roles", "openings", "bounty"] },
      { label: "Candidates", href: "/candidates", icon: Users, keywords: ["pipeline", "applicants", "talent"] },
      { label: "Assessments", href: "/assessments", icon: Code2, keywords: ["tests", "coding", "evaluation"] },
      { label: "Resume Ranker", href: "/resume-ranker", icon: Trophy, keywords: ["ai", "scoring", "rank", "match"] },
    ],
  },
  {
    title: "HR & Operations",
    items: [
      { label: "Appraisals", href: "/appraisal", icon: Star, keywords: ["reviews", "performance", "cycles"] },
      { label: "BGV Verification", href: "/bgv", icon: ShieldCheck, keywords: ["background check", "identity"] },
      { label: "Compensation", href: "/compensation/team", icon: Wallet, keywords: ["salary", "payroll", "increments"] },
      { label: "Billing & Escrow", href: "/company/financials", icon: IndianRupee, keywords: ["invoices", "payments", "rewards"] },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, keywords: ["alerts", "inbox", "updates"] },
      { label: "Reports", href: "/admin/reports", icon: BarChart3, keywords: ["exports", "metrics", "charts"] },
      { label: "Admin Settings", href: "/admin/users", icon: Shield, keywords: ["users", "permissions", "roles"] },
      { label: "Support", href: "/support", icon: LifeBuoy, keywords: ["help", "ticket", "contact"] },
    ],
  },
];

const recruiterNavSections: NavSection[] = [
  {
    title: "Sourcing",
    items: [
      { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard, keywords: ["overview", "home", "stats"] },
      { label: "Discover Jobs", href: "/recruiter/discover", icon: Compass, keywords: ["mandates", "bounties", "search"] },
      { label: "Explore Market", href: "/recruiter/external-jobs", icon: Globe, keywords: ["external", "aggregated"] },
      { label: "My Referrals", href: "/recruiter/referrals", icon: Users, keywords: ["submissions", "candidates", "claims"] },
      { label: "My Applications", href: "/recruiter/applications", icon: Briefcase, keywords: ["pipeline", "tracking"] },
      { label: "Leaderboard", href: "/recruiter/leaderboard", icon: Trophy, keywords: ["ranking", "top recruiters"] },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, keywords: ["alerts", "inbox", "updates"] },
      { label: "Earnings", href: "/recruiter/earnings", icon: IndianRupee, keywords: ["payouts", "rewards", "bounty"] },
      { label: "Profile & Resume", href: "/recruiter/profile", icon: UserCircle, keywords: ["account", "bank", "kyc"] },
      { label: "Support", href: "/support", icon: LifeBuoy, keywords: ["help", "ticket"] },
    ],
  },
];

const candidateNavSections: NavSection[] = [
  {
    title: "Opportunities",
    items: [
      { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard, keywords: ["overview", "home", "stats"] },
      { label: "Browse Jobs", href: "/candidate/jobs", icon: Compass, keywords: ["openings", "search", "apply"] },
      ...(process.env.NEXT_PUBLIC_FEATURE_EXTERNAL_JOBS === "true"
        ? [{ label: "Explore Market", href: "/candidate/external-jobs", icon: Globe, keywords: ["external", "market"] }]
        : []),
      { label: "Saved Jobs", href: "/candidate/jobs?saved=true", icon: Heart, keywords: ["bookmarks", "favorites"] },
      { label: "My Applications", href: "/candidate/applications", icon: Briefcase, keywords: ["status", "interviews"] },
      { label: "Referral Requests", href: "/candidate/referrals", icon: Users, keywords: ["consent", "endorsements"] },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, keywords: ["alerts", "inbox", "updates"] },
      { label: "Profile", href: "/candidate/profile", icon: UserCircle, keywords: ["resume", "skills", "account"] },
      { label: "Support", href: "/support", icon: LifeBuoy, keywords: ["help", "ticket"] },
    ],
  },
];

// ── Color accent & portal metadata per role ─────────────────────────────

export const roleConfig = {
  company: {
    sections: companyNavSections,
    homeHref: "/dashboard",
    portalHref: "/admin/settings",
    portalTitle: "Company Portal",
    portalSubtitle: "Hiring & Talent Pipeline",
    accent: "text-indigo-600 dark:text-indigo-400",
    activeBg:
      "bg-indigo-50/90 text-indigo-700 font-semibold ring-1 ring-indigo-200/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/60",
    activeBar: "bg-indigo-600 dark:bg-indigo-400",
    dot: "bg-indigo-500",
    dotPing: "bg-indigo-400",
    toggleHover:
      "hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-700 dark:hover:text-indigo-400",
    railHoverBg: "group-hover/edge:bg-indigo-400/50 dark:group-hover/edge:bg-indigo-500/40",
    cardGradient: "from-indigo-500 to-purple-600",
    cardStyle:
      "border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-indigo-50/60 to-purple-50/40 hover:border-indigo-300 dark:border-indigo-800/60 dark:from-indigo-950/50 dark:via-indigo-950/30 dark:to-purple-950/30 dark:hover:border-indigo-700",
    badgeStyle:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300",
    PortalIcon: Building2,
  },
  recruiter: {
    sections: recruiterNavSections,
    homeHref: "/recruiter/dashboard",
    portalHref: "/recruiter/profile",
    portalTitle: "Recruiter Portal",
    portalSubtitle: "Sourcing & Direct Apply",
    accent: "text-sky-600 dark:text-sky-400",
    activeBg:
      "bg-sky-50/90 text-sky-700 font-semibold ring-1 ring-sky-200/70 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/60",
    activeBar: "bg-sky-600 dark:bg-sky-400",
    dot: "bg-sky-500",
    dotPing: "bg-sky-400",
    toggleHover:
      "hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-700 dark:hover:text-sky-400",
    railHoverBg: "group-hover/edge:bg-sky-400/50 dark:group-hover/edge:bg-sky-500/40",
    cardGradient: "from-sky-500 to-cyan-600",
    cardStyle:
      "border-sky-200/90 bg-gradient-to-r from-sky-50/90 via-sky-50/60 to-cyan-50/40 hover:border-sky-300 dark:border-sky-800/60 dark:from-sky-950/50 dark:via-sky-950/30 dark:to-cyan-950/30 dark:hover:border-sky-700",
    badgeStyle:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-300",
    PortalIcon: Compass,
  },
  candidate: {
    sections: candidateNavSections,
    homeHref: "/candidate/dashboard",
    portalHref: "/candidate/profile",
    portalTitle: "Candidate Portal",
    portalSubtitle: "Applications & Matches",
    accent: "text-emerald-600 dark:text-emerald-400",
    activeBg:
      "bg-emerald-50/90 text-emerald-700 font-semibold ring-1 ring-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/60",
    activeBar: "bg-emerald-600 dark:bg-emerald-400",
    dot: "bg-emerald-500",
    dotPing: "bg-emerald-400",
    toggleHover:
      "hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400",
    railHoverBg: "group-hover/edge:bg-emerald-400/50 dark:group-hover/edge:bg-emerald-500/40",
    cardGradient: "from-emerald-500 to-teal-600",
    cardStyle:
      "border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-emerald-50/60 to-teal-50/40 hover:border-emerald-300 dark:border-emerald-800/60 dark:from-emerald-950/50 dark:via-emerald-950/30 dark:to-teal-950/30 dark:hover:border-emerald-700",
    badgeStyle:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300",
    PortalIcon: UserCircle,
  },
} as const;

export function getPortalNavSections(userType: PortalRole): NavSection[] {
  return (roleConfig[userType] ?? roleConfig.company).sections;
}

// ── Route + query matching (fixes /candidate/jobs?saved=true) ────────────

function matchesQuery(itemQuery: string, searchString: string): boolean {
  const targetParams = new URLSearchParams(itemQuery);
  const currentParams = new URLSearchParams(searchString);
  return Array.from(targetParams.entries()).every(
    ([key, val]) => currentParams.get(key) === val
  );
}

function isNavItemActive(
  item: NavItem,
  pathname: string,
  searchString: string,
  allItems: NavItem[]
): boolean {
  const [itemPath, itemQuery] = item.href.split("?");

  if (itemQuery) {
    return pathname === itemPath && matchesQuery(itemQuery, searchString);
  }

  // Defer base route highlight (e.g. /candidate/jobs) when a query variant (e.g. ?saved=true) matches
  const siblingQueryMatches = allItems.some((other) => {
    if (other.href === item.href || !other.href.includes("?")) return false;
    const [otherPath, otherQuery] = other.href.split("?");
    return otherPath === itemPath && pathname === otherPath && matchesQuery(otherQuery, searchString);
  });
  if (siblingQueryMatches) return false;

  const isDashboardRoot =
    itemPath === "/dashboard" ||
    itemPath === "/recruiter/dashboard" ||
    itemPath === "/candidate/dashboard";

  return (
    pathname === itemPath ||
    (!isDashboardRoot && pathname.startsWith(itemPath + "/"))
  );
}

// Reads URL query string safely inside a Suspense boundary for static prerendering
function SearchQuerySync({ onChange }: { onChange: (value: string) => void }) {
  const searchParams = useSearchParams();
  const str = searchParams.toString();
  useEffect(() => {
    onChange(str);
  }, [str, onChange]);
  return null;
}

// ── Tooltip state for collapsed icon-rail mode ───────────────────────────

interface FloatingTooltipState {
  label: string;
  section?: string;
  badge?: number;
  shortcut?: string;
  top: number;
  left: number;
}

interface SidebarProps {
  userType?: PortalRole;
}

export function Sidebar({ userType = "company" }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const shell = useOptionalWorkspaceShell();

  const [fallbackCollapsed, setFallbackCollapsed] = useState(false);
  const [fallbackSections, setFallbackSections] = useState<Record<string, boolean>>({});
  const [searchString, setSearchString] = useState("");
  const [tooltip, setTooltip] = useState<FloatingTooltipState | null>(null);

  const effectiveRole: PortalRole = shell?.userType ?? userType;
  const config = roleConfig[effectiveRole] ?? roleConfig.company;
  const { sections, homeHref, PortalIcon } = config;
  const allItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections]
  );

  const isCollapsed = shell ? shell.isCollapsed : fallbackCollapsed;
  const hydrated = shell ? shell.hydrated : false;
  const unreadCount = shell ? shell.unreadCount : 0;
  const isMobileOpen = shell ? shell.isMobileOpen : false;

  const toggleCollapsed = shell
    ? shell.toggleCollapsed
    : () => setFallbackCollapsed((c) => !c);
  const closeMobile = useCallback(() => {
    shell?.setMobileOpen(false);
  }, [shell]);

  const isSectionCollapsed = useCallback(
    (title: string) => {
      if (shell) return shell.isSectionCollapsed(title);
      return Boolean(fallbackSections[title]);
    },
    [shell, fallbackSections]
  );

  const toggleSection = useCallback(
    (title: string) => {
      if (shell) {
        shell.toggleSection(title);
      } else {
        setFallbackSections((prev) => ({ ...prev, [title]: !prev[title] }));
      }
    },
    [shell]
  );

  // Clear floating tooltip whenever collapsed state or route changes
  useEffect(() => {
    setTooltip(null);
  }, [isCollapsed, pathname, searchString]);

  const showFloatingTooltip = useCallback(
    (
      e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
      data: Omit<FloatingTooltipState, "top" | "left">
    ) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        ...data,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    },
    []
  );

  const hideFloatingTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  const logoTheme = hydrated && resolvedTheme === "dark" ? "dark" : "light";

  const renderSidebarBody = ({
    collapsed,
    mobile = false,
  }: {
    collapsed: boolean;
    mobile?: boolean;
  }) => (
    <>
      {/* Logo Header */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-slate-200/70 dark:border-slate-800/80 transition-[padding] duration-200",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
        style={{ height: "var(--topbar-height)" }}
      >
        <QuestEdgeLogo
          href={homeHref}
          variant={collapsed ? "icon" : "full"}
          theme={logoTheme}
          size="md"
          priority
        />
        {mobile && (
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable Nav */}
      <nav
        aria-label="Sidebar navigation"
        onScroll={() => {
          if (tooltip) setTooltip(null);
        }}
        className={cn(
          "scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden py-2.5",
          collapsed ? "px-2 space-y-1.5" : "px-2.5 space-y-2.5"
        )}
      >
        {sections.map((section, sIdx) => {
          const title = section.title;
          const sectionCollapsed = Boolean(!collapsed && title && isSectionCollapsed(title));
          const hasActiveChild = section.items.some((item) =>
            isNavItemActive(item, pathname, searchString, allItems)
          );

          return (
            <div key={title || sIdx}>
              {/* Collapsed icon-rail section divider */}
              {collapsed && sIdx > 0 && (
                <div
                  role="separator"
                  className="mx-auto my-2 w-6 border-t border-slate-200/80 dark:border-slate-700/80"
                />
              )}

              {/* Expanded collapsible section header */}
              {!collapsed && title && (
                <button
                  type="button"
                  onClick={() => toggleSection(title)}
                  aria-expanded={!sectionCollapsed}
                  className="group/sec flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover/sec:text-slate-700 dark:text-slate-400 dark:group-hover/sec:text-slate-200">
                    <span>{title}</span>
                    {sectionCollapsed && hasActiveChild && (
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", config.dot)}
                        title="Active page inside section"
                      />
                    )}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-slate-400 opacity-60 transition-transform duration-200 group-hover/sec:opacity-100 dark:text-slate-500",
                      sectionCollapsed && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Accordion items container */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                  sectionCollapsed
                    ? "grid-rows-[0fr] opacity-0 pointer-events-none"
                    : "grid-rows-[1fr] opacity-100"
                )}
              >
                <div className="overflow-hidden">
                  <div className={cn("space-y-0.5", !collapsed && title && "pt-0.5")}>
                    {section.items.map((item) => {
                      const isActive = isNavItemActive(
                        item,
                        pathname,
                        searchString,
                        allItems
                      );
                      const isNotifications = item.href === "/notifications";
                      const badgeCount = isNotifications ? unreadCount : 0;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={mobile ? closeMobile : undefined}
                          onMouseEnter={
                            collapsed
                              ? (e) =>
                                showFloatingTooltip(e, {
                                  label: item.label,
                                  section: title,
                                  badge: badgeCount > 0 ? badgeCount : undefined,
                                })
                              : undefined
                          }
                          onMouseLeave={collapsed ? hideFloatingTooltip : undefined}
                          onFocus={
                            collapsed
                              ? (e) =>
                                showFloatingTooltip(e, {
                                  label: item.label,
                                  section: title,
                                  badge: badgeCount > 0 ? badgeCount : undefined,
                                })
                              : undefined
                          }
                          onBlur={collapsed ? hideFloatingTooltip : undefined}
                          aria-label={collapsed ? item.label : undefined}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group/item relative flex items-center rounded-[10px] text-[13.5px] font-medium transition-all duration-150",
                            collapsed
                              ? "mx-auto h-10 w-10 justify-center p-0"
                              : "gap-2.5 px-2.5 py-[7px]",
                            isActive
                              ? config.activeBg
                              : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                          )}
                        >
                          {/* Active left indicator bar */}
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className={cn(
                                "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full",
                                config.activeBar
                              )}
                            />
                          )}

                          <span className="relative flex shrink-0 items-center justify-center">
                            <item.icon
                              className={cn(
                                "h-[18px] w-[18px] transition-transform duration-150 group-hover/item:scale-105",
                                isActive
                                  ? config.accent
                                  : "text-slate-500 group-hover/item:text-slate-700 dark:text-slate-400 dark:group-hover/item:text-slate-200"
                              )}
                            />
                            {collapsed && badgeCount > 0 && (
                              <span
                                aria-label={`${badgeCount} unread notifications`}
                                className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"
                              />
                            )}
                          </span>

                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {badgeCount > 0 && (
                                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-2xs">
                                  {badgeCount > 99 ? "99+" : badgeCount}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Role Workspace Card */}
      <div
        className={cn(
          "shrink-0 border-t border-slate-200/70 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/70",
          collapsed ? "p-2 flex justify-center" : "p-2.5"
        )}
      >
        <Link
          href={config.portalHref}
          onClick={mobile ? closeMobile : undefined}
          onMouseEnter={
            collapsed
              ? (e) =>
                showFloatingTooltip(e, {
                  label: config.portalTitle,
                  section: config.portalSubtitle,
                })
              : undefined
          }
          onMouseLeave={collapsed ? hideFloatingTooltip : undefined}
          onFocus={
            collapsed
              ? (e) =>
                showFloatingTooltip(e, {
                  label: config.portalTitle,
                  section: config.portalSubtitle,
                })
              : undefined
          }
          onBlur={collapsed ? hideFloatingTooltip : undefined}
          aria-label={
            collapsed
              ? `${config.portalTitle} — ${config.portalSubtitle}`
              : undefined
          }
          title={
            collapsed
              ? undefined
              : `View ${effectiveRole} profile and settings`
          }
          className={cn(
            "group relative flex items-center rounded-xl border transition-all duration-200 shadow-2xs hover:shadow-xs",
            config.cardStyle,
            collapsed
              ? "h-10 w-10 justify-center p-0"
              : "w-full justify-between p-2"
          )}
        >
          <div className={cn("flex items-center min-w-0", !collapsed && "gap-2.5")}>
            <div
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-xs transition-transform group-hover:scale-105",
                config.cardGradient
              )}
            >
              <PortalIcon className="h-4 w-4" />
              {collapsed && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      config.dotPing
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900",
                      config.dot
                    )}
                  />
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                    {config.portalTitle}
                  </span>
                </div>
                <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {config.portalSubtitle}
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center pl-1 shrink-0" title="Active workspace">
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    config.dotPing
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-2 w-2 rounded-full",
                    config.dot
                  )}
                />
              </span>
            </div>
          )}
        </Link>
      </div>
    </>
  );

  return (
    <>
      <Suspense fallback={null}>
        <SearchQuerySync onChange={setSearchString} />
      </Suspense>

      {/* Desktop Interactive Sidebar */}
      <aside
        aria-label="Sidebar"
        className={cn(
          "relative hidden lg:flex h-full shrink-0 flex-col border-r border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-slate-900 select-none",
          hydrated && "transition-[width] duration-200 ease-out"
        )}
        style={{
          width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        }}
      >
        {renderSidebarBody({ collapsed: isCollapsed })}

        {/* Interactive Right-Edge Rail Highlight + Toggle Pill */}
        <div
          className="group/edge absolute inset-y-0 -right-1 z-20 hidden lg:block w-2"
          onDoubleClick={toggleCollapsed}
        >
          <div
            className={cn(
              "mx-auto h-full w-[2px] transition-colors duration-150",
              config.railHoverBg
            )}
          />
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          onMouseEnter={(e) =>
            showFloatingTooltip(e, {
              label: isCollapsed ? "Expand sidebar" : "Collapse sidebar",
              shortcut: "⌘B",
            })
          }
          onMouseLeave={hideFloatingTooltip}
          onFocus={(e) =>
            showFloatingTooltip(e, {
              label: isCollapsed ? "Expand sidebar" : "Collapse sidebar",
              shortcut: "⌘B",
            })
          }
          onBlur={hideFloatingTooltip}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-[21px] z-30 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-all duration-150 hover:scale-110 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
            config.toggleHover
          )}
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isCollapsed && "rotate-180"
            )}
          />
        </button>
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full w-[272px] max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in slide-in-from-left duration-200">
            {renderSidebarBody({ collapsed: false, mobile: true })}
          </aside>
        </div>
      )}

      {/* Floating Portal Tooltip (never clipped by overflow-y-auto) */}
      {tooltip && (
        <div
          role="tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
          className="pointer-events-none fixed z-[60] -translate-y-1/2 hidden lg:flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Caret */}
          <span
            aria-hidden="true"
            className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-slate-700/80 bg-slate-900 dark:bg-slate-800"
          />
          <div className="flex flex-col">
            <span className="font-semibold leading-tight whitespace-nowrap">
              {tooltip.label}
            </span>
            {tooltip.section && (
              <span className="text-[10px] text-slate-400 leading-tight whitespace-nowrap">
                {tooltip.section}
              </span>
            )}
          </div>
          {tooltip.badge && tooltip.badge > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {tooltip.badge > 99 ? "99+" : tooltip.badge}
            </span>
          )}
          {tooltip.shortcut && (
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-300 dark:bg-slate-900">
              {tooltip.shortcut}
            </kbd>
          )}
        </div>
      )}
    </>
  );
}
