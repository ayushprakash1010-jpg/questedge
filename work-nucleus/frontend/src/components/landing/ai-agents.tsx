"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles, ShieldCheck, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const agents = [
  {
    name: "AI Screening & Fit Engine",
    description:
      "Evaluates candidate resumes against mandate rubrics using Gemini AI. Computes fit percentages, identifies core skill strengths, and flags capability gaps before recruiter handoff.",
    tag: "Screening",
    icon: Sparkles,
  },
  {
    name: "Smart Mandate & JD Drafter",
    description:
      "Generates structured, inclusive job descriptions and market-calibrated salary benchmarks from minimal inputs in under 10 seconds.",
    tag: "Mandates",
    icon: Bot,
  },
  {
    name: "Automated BGV Risk Evaluator",
    description:
      "Performs automated background verification screening on identity, employment records, and court registries with risk scoring and discrepancy flags.",
    tag: "Compliance",
    icon: ShieldCheck,
  },
  {
    name: "Offer & Compensation Drafter",
    description:
      "Creates personalized, legally compliant offer letters with customized fixed/variable splits, ESOP vesting schedules, and joining bonus clauses.",
    tag: "Offers",
    icon: FileSpreadsheet,
  },
];

export function AIAgents() {
  return (
    <section
      id="ai-agents"
      className="relative overflow-hidden bg-slate-900 py-24 sm:py-32"
    >
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.18),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Powered by Google Gemini 2.5 AI
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI talent engines built for precision hiring
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Automate time-consuming screening, compensation modeling, and verification workflows with purpose-built AI agents embedded directly into the hiring pipeline.
          </p>
        </div>

        {/* Agent Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:max-w-4xl lg:mx-auto">
          {agents.map((agent, i) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur transition-all hover:border-indigo-500/50 hover:bg-slate-800/90 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-md">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                    {agent.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {agent.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {agent.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
