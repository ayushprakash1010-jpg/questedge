"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown, Building2, Target, UserCircle } from "lucide-react";

const navLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Companies", href: "/#for-companies" },
  { label: "For Recruiters", href: "/#for-recruiters" },
  { label: "Browse Jobs", href: "/jobs" },
  { label: "Pricing", href: "/#pricing" },
];

const joinOptions = [
  {
    icon: Building2,
    label: "Post a Mandate",
    sub: "Hire with referrals",
    href: "/auth/login",
    color: "text-indigo-600",
    bg: "hover:bg-indigo-50",
  },
  {
    icon: Target,
    label: "Join as Recruiter",
    sub: "Refer & earn rewards",
    href: "/auth/login",
    color: "text-violet-600",
    bg: "hover:bg-violet-50",
  },
  {
    icon: UserCircle,
    label: "I'm a Candidate",
    sub: "Track my applications",
    href: "/auth/login",
    color: "text-emerald-600",
    bg: "hover:bg-emerald-50",
  },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500">
            <span className="text-sm font-bold text-white">Q</span>
          </div>
          <span className="text-lg font-bold text-slate-900">
            Quest<span className="text-indigo-600">Edge</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600"
          >
            Log in
          </Link>

          {/* Join dropdown */}
          <div className="relative">
            <button
              onClick={() => setJoinOpen(!joinOpen)}
              onBlur={() => setTimeout(() => setJoinOpen(false), 150)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
            >
              Join Now
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${joinOpen ? "rotate-180" : ""}`} />
            </button>

            {joinOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/60">
                {joinOptions.map((opt) => (
                  <Link
                    key={opt.label}
                    href={opt.href}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${opt.bg}`}
                  >
                    <opt.icon className={`h-4 w-4 mt-0.5 shrink-0 ${opt.color}`} />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.sub}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-6 w-6 text-slate-700" />
          ) : (
            <Menu className="h-6 w-6 text-slate-700" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2" />
            <Link href="/auth/login" className="text-sm font-medium text-slate-700">
              Log in
            </Link>
            {joinOptions.map((opt) => (
              <Link
                key={opt.label}
                href={opt.href}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                <opt.icon className={`h-4 w-4 ${opt.color}`} />
                {opt.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}


