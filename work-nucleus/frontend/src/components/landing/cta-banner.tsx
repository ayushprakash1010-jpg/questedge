import Link from "next/link";
import { ArrowRight, Building2, Target, UserCircle } from "lucide-react";

export function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-20">
      {/* Background decorations */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to hire smarter with verified referrals?
          </h2>
          <p className="mt-3 text-lg text-slate-400">
            Join the ecosystem where companies, independent recruiters, and top candidates connect with full transparency.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Company CTA */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-8 backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">Hiring top talent?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Post your mandate in under 5 minutes. Tap into verified independent recruiters,
              screen candidates with Gemini AI, and pay only on successful tenure completion.
            </p>
            <Link
              href="/auth/login?returnTo=/dashboard"
              className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              Post a Mandate
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Recruiter CTA */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-8 backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">Have a strong network?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Monetize your talent network with 48-hour claim scope exclusivity.
              Browse active mandates, submit consent-verified referrals, and earn bounties.
            </p>
            <Link
              href="/auth/login?returnTo=/recruiter/dashboard"
              className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-500"
            >
              Join as Recruiter
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Candidate exploration link */}
        <div className="mt-10 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <UserCircle className="h-4 w-4" />
            Looking for your next career move? Explore open marketplace roles & portal
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
