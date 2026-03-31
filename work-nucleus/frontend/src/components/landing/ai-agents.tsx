"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

const agents = [
  {
    name: "JD Generator",
    description:
      "Creates compelling, inclusive job descriptions from minimal input. Adapts tone, format, and requirements to your brand.",
    tag: "Content",
  },
  {
    name: "Feedback Summarizer",
    description:
      "Condenses multi-interviewer feedback into structured summaries with key themes, concerns, and consensus highlights.",
    tag: "Analysis",
  },
  {
    name: "Candidate Scorer",
    description:
      "Evaluates candidates across skill dimensions using structured rubrics. Provides composite scores and ranking recommendations.",
    tag: "Scoring",
  },
  {
    name: "Communication Drafter",
    description:
      "Generates personalized offer letters, rejection emails, and follow-ups that maintain your employer brand voice.",
    tag: "Communication",
  },
];

export function AIAgents() {
  return (
    <section
      id="ai-agents"
      className="relative overflow-hidden bg-slate-900 py-24 sm:py-32"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Claude
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI agents that work for you
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Purpose-built AI agents handle time-consuming HR tasks in seconds.
            Starting with 4 hiring agents — with more agents for every HR
            module on the roadmap.
          </p>
        </div>

        {/* Agent Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:max-w-3xl lg:mx-auto">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur transition-all hover:border-indigo-500/40 hover:bg-slate-800/80"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                  {agent.tag}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                {agent.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {agent.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
