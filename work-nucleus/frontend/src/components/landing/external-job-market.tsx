"use client";

import { motion } from "framer-motion";
import {
  Globe,
  Sparkles,
  Bookmark,
  ArrowRight,
  Search,
  TrendingUp,
  Zap,
} from "lucide-react";

const jobSources = [
  { name: "Greenhouse", color: "bg-emerald-500" },
  { name: "Lever", color: "bg-blue-500" },
  { name: "Ashby", color: "bg-violet-500" },
  { name: "Jobicy", color: "bg-orange-500" },
  { name: "Remotive", color: "bg-cyan-500" },
  { name: "Careerjet", color: "bg-rose-500" },
];

const sampleJobs = [
  {
    title: "Sr Software Engineer I/II, Operational AI",
    company: "Samsara",
    location: "Remote",
    tags: ["Machine Learning", "AI", "Computer Vision"],
    source: "Greenhouse",
    sourceColor: "text-emerald-600 bg-emerald-50",
    posted: "Today",
  },
  {
    title: "Staff ML Platform Engineer",
    company: "Stripe",
    location: "Bangalore",
    tags: ["Python", "PyTorch", "Kubernetes"],
    source: "Lever",
    sourceColor: "text-blue-600 bg-blue-50",
    posted: "Today",
  },
  {
    title: "Senior Product Designer",
    company: "Figma",
    location: "Remote",
    tags: ["Figma", "Design Systems", "UI/UX"],
    source: "Ashby",
    sourceColor: "text-violet-600 bg-violet-50",
    posted: "1d ago",
  },
];

const features = [
  {
    icon: Search,
    title: "Unified Search",
    desc: "Search across all boards with one query — filter by role, skill, location, or company.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered \"For You\"",
    desc: "Gemini AI analyzes your profile and recommends jobs tailored to your skills and experience.",
  },
  {
    icon: Bookmark,
    title: "Save & Track",
    desc: "Bookmark interesting roles, track your application activity, and get alerts on new matches.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Sync",
    desc: "Jobs are synced continuously — new postings appear within hours of being published.",
  },
];

export function ExternalJobMarket() {
  return (
    <section
      id="external-job-market"
      className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 py-24 sm:py-32"
    >
      {/* Ambient glow decorations */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Globe className="h-3.5 w-3.5" />
            External Job Market
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Explore{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              thousands of live jobs
            </span>{" "}
            from top hiring platforms
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-400">
            Discover roles from Greenhouse, Lever, Ashby, Jobicy, Remotive,
            Careerjet &amp; more — all aggregated in one place with AI-powered
            recommendations personalized for your profile.
          </p>
        </motion.div>

        {/* Source Badges Strip */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {jobSources.map((source) => (
            <span
              key={source.name}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-sm"
            >
              <span
                className={`h-2 w-2 rounded-full ${source.color}`}
              />
              {source.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            + more sources
          </span>
        </motion.div>

        {/* Content Grid: Preview Cards + Features */}
        <div className="mt-16 grid items-start gap-10 lg:grid-cols-12">
          {/* Left: Job Preview Cards */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="rounded-3xl border border-slate-700/60 bg-slate-800/50 p-2 backdrop-blur-sm shadow-2xl">
              {/* Mock Browser Header */}
              <div className="flex items-center gap-2 border-b border-slate-700/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="ml-3 flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-1 text-[11px] text-slate-400 font-mono flex-1 max-w-xs">
                  <Search className="h-3 w-3" />
                  questedge.in/candidate/external-jobs
                </div>
              </div>

              {/* Mock Tab Bar */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white">
                  Explore Market
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                  For You
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-r from-indigo-500 to-violet-500 text-[8px] font-bold text-white">
                    AI
                  </span>
                </span>
                <span className="rounded-lg bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                  Saved
                </span>
              </div>

              {/* Job Cards */}
              <div className="space-y-2 p-4 pt-2">
                {sampleJobs.map((job, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-4 transition-all hover:border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {job.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {job.company}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        ● {job.location}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-slate-600/50 bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span
                        className={`rounded-md px-2 py-0.5 font-semibold ${job.sourceColor}`}
                      >
                        via {job.source}
                      </span>
                      <span className="text-slate-500">
                        Posted {job.posted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom stats bar */}
              <div className="flex items-center justify-between border-t border-slate-700/50 px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Zap className="h-3.5 w-3.5" />
                  Thousands of active roles
                </span>
                <span className="text-[10px] text-slate-500">
                  Continuously synced across ATS boards
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Feature Highlights */}
          <motion.div
            className="lg:col-span-5 space-y-5"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {features.map((feat, i) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:bg-slate-800/60"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {feat.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* CTA */}
            <div className="pt-2">
              <a
                href="/auth/login?returnTo=/candidate/external-jobs"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:gap-3"
              >
                Explore the Job Market
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Free for all candidates — no sign-up required to browse
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
