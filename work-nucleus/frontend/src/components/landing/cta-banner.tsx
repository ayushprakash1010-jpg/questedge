import Link from "next/link";
import { ArrowRight, Building2, Target, Globe, UserCircle } from "lucide-react";

export function CTABanner() {
  return (
    <section aria-labelledby="cta-heading" className="relative overflow-hidden bg-slate-900 py-16">
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-800/40 px-6 py-12 text-center shadow-2xl backdrop-blur-sm sm:px-12">
          <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to hire smarter with verified referrals?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-300">
            Connect companies, independent recruiters, and consent-first candidates with AI screening and milestone-backed bounties.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="/auth/login?returnTo=/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span>Post a Mandate</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>

            <a
              href="/auth/login?returnTo=/recruiter/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>Join as Recruiter</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>

            <a
              href="/auth/login?returnTo=/candidate/external-jobs"
              className="group inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span>Explore Job Market</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-7">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <UserCircle className="h-4 w-4" aria-hidden="true" />
              <span>Or browse open referral mandates directly</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
