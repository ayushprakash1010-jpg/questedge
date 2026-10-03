import Link from "next/link";
import { ArrowRight, Building2, Target } from "lucide-react";

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
            Ready to hire smarter?
          </h2>
          <p className="mt-3 text-lg text-slate-400">
            Join the marketplace where great companies, great recruiters, and great candidates connect.
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
              Post your first mandate in under 5 minutes. Access verified independent recruiters
              and pay only when you hire.
            </p>
            <Link
              href="/auth/login"
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
              Start earning from your referrals today. Browse open mandates, refer candidates,
              and track your rewards — free to join.
            </p>
            <Link
              href="/auth/login"
              className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-500"
            >
              Join as Recruiter
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
