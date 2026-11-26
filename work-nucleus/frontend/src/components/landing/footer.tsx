import Link from "next/link";
import { QuestEdgeLogo } from "@/components/QuestEdgeLogo";

const productLinks = [
  { label: "Marketplace Preview", href: "/#marketplace-preview" },
  { label: "Platform Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Savings Calculator", href: "/#roi-calculator" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

const marketplaceLinks = [
  { label: "Company Portal", href: "/auth/login?returnTo=/dashboard" },
  { label: "Recruiter Portal", href: "/auth/login?returnTo=/recruiter/dashboard" },
  { label: "Candidate Portal", href: "/auth/login?returnTo=/candidate/dashboard" },
  { label: "Open Mandates", href: "/jobs" },
];

const companyLinks = [
  { label: "About QuestEdge", href: "/#how-it-works" },
  { label: "Contact Support", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "GDPR & DPDP", href: "/gdpr" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <QuestEdgeLogo href="/" theme="dark" size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              The AI-powered referral hiring marketplace connecting companies, independent recruiters, and top candidates. Pay only on verified tenure completion.
            </p>

            {/* Status indicator */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </div>

            {/* Social Links */}
            <div className="mt-6 flex gap-3">
              <a
                href="https://linkedin.com/company/questedge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-indigo-600 hover:text-white"
                aria-label="QuestEdge on LinkedIn"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-indigo-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Marketplace
            </h3>
            <ul className="mt-4 space-y-3">
              {marketplaceLinks.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("/auth") ? (
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-indigo-400"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-indigo-400"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-indigo-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Compliance
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-indigo-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} QuestEdge Technologies. Built with DPDP Act 2023 & GDPR consent architecture.
          </div>
          <div>
            Zero retainers. Performance-backed talent bounties.
          </div>
        </div>
      </div>
    </footer>
  );
}
