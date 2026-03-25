import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-700 py-20">
      {/* Background decorations */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to transform your hiring?
        </h2>
        <p className="mt-4 text-lg text-indigo-100">
          Join hundreds of teams using AI to hire smarter, faster, and fairer.
          Start free — no credit card required.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/login"
            className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-indigo-400 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
          >
            Talk to Sales
          </Link>
        </div>
      </div>
    </section>
  );
}
