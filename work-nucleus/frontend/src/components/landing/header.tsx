"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, Building2, Target, UserCircle } from "lucide-react";

const navLinks = [
  { label: "Marketplace", href: "/#marketplace-preview" },
  { label: "Features", href: "/#features" },
  { label: "AI Engines", href: "/#ai-agents" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Calculator", href: "/#roi-calculator" },
  { label: "Pricing", href: "/#pricing" },
];

const joinOptions = [
  {
    icon: Building2,
    label: "Post a Mandate",
    sub: "Hire with referrals",
    href: "/auth/login?returnTo=/dashboard",
    color: "text-indigo-600",
    bg: "hover:bg-indigo-50",
  },
  {
    icon: Target,
    label: "Join as Recruiter",
    sub: "Refer & earn rewards",
    href: "/auth/login?returnTo=/recruiter/dashboard",
    color: "text-violet-600",
    bg: "hover:bg-violet-50",
  },
  {
    icon: UserCircle,
    label: "I'm a Candidate",
    sub: "Track my applications",
    href: "/auth/login?returnTo=/candidate/dashboard",
    color: "text-emerald-600",
    bg: "hover:bg-emerald-50",
  },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll listener for reading progress bar and elevation
  useEffect(() => {
    function handleScroll() {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const current = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, current)));
      }
      setScrolled(window.scrollY > 20);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setJoinOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setJoinOpen(false);
        setMobileOpen(false);
      }
    }

    if (joinOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [joinOpen]);

  return (
    <>
      {/* Top Hairline Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 z-50 origin-left transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <header
        className={`sticky top-0 z-40 transition-all duration-200 border-b ${
          scrolled
            ? "border-slate-200/90 bg-white/95 shadow-md shadow-slate-900/5 backdrop-blur-xl"
            : "border-slate-200/60 bg-white/80 backdrop-blur-lg"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 focus-visible:outline-indigo-600" aria-label="QuestEdge Home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 shadow-sm">
              <span className="text-sm font-bold text-white">Q</span>
            </div>
            <span className="text-lg font-bold text-slate-900">
              Quest<span className="text-indigo-600">Edge</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="/auth/login?returnTo=/dashboard"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
            >
              Log in
            </a>

            {/* Accessible Join Now dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
                aria-haspopup="true"
                aria-expanded={joinOpen}
                onClick={() => setJoinOpen(!joinOpen)}
              >
                <span>Join Now</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${joinOpen ? "rotate-180" : ""}`} />
              </button>

              {joinOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl ring-1 ring-slate-900/5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                >
                  {joinOptions.map((opt) => (
                    <a
                      key={opt.label}
                      href={opt.href}
                      role="menuitem"
                      className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${opt.bg}`}
                      onClick={() => setJoinOpen(false)}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <opt.icon className={`h-4 w-4 ${opt.color}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                        <div className="text-[11px] text-slate-500">{opt.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Toggle */}
          <button
            type="button"
            className="md:hidden rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 focus-visible:outline-indigo-600"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
            <nav className="flex flex-col gap-3 pt-3" aria-label="Mobile Navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-slate-200" />
              <a
                href="/auth/login?returnTo=/dashboard"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </a>
              {joinOptions.map((opt) => (
                <a
                  key={opt.label}
                  href={opt.href}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
                  onClick={() => setMobileOpen(false)}
                >
                  <opt.icon className={`h-4 w-4 ${opt.color}`} />
                  {opt.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
