"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Sparkles, ShieldCheck, FileSpreadsheet,
  CheckCircle2, Terminal, ArrowRight, Check,
  Cpu, FileText, Lock, AlertTriangle
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  tag: string;
  icon: typeof Sparkles;
  latency: string;
  outputTitle: string;
  preview: {
    badge: string;
    score?: string;
    summary: string;
    keyPoints: { label: string; value: string; status?: "success" | "warning" | "neutral" }[];
    footerNote: string;
  };
}

const agents: Agent[] = [
  {
    id: "screening",
    name: "AI Screening & Fit Engine",
    description:
      "Evaluates candidate resumes against mandate rubrics using Gemini AI. Computes fit percentages, identifies core skill strengths, and flags capability gaps before recruiter handoff.",
    tag: "Candidate Screening",
    icon: Sparkles,
    latency: "340ms • Gemini AI Engine",
    outputTitle: "Gemini Fit Scorecard #SC-892",
    preview: {
      badge: "96% Strong Match",
      score: "96%",
      summary: "Evaluated against Staff Distributed Systems Engineer mandate (#MND-842). Candidate exhibits top-decile distributed systems depth with zero critical skill gaps.",
      keyPoints: [
        { label: "Core Tech Match", value: "Go, Apache Kafka, Raft, Distributed DB", status: "success" },
        { label: "Scale Experience", value: "2M+ transactions/sec in FinTech scaleup", status: "success" },
        { label: "Retention Risk", value: "Low (Avg tenure: 3.4 yrs per organization)", status: "success" },
        { label: "Capability Gaps", value: "Minor: Kubernetes Operator development (Trainable)", status: "warning" },
      ],
      footerNote: "Recommendation: Auto-advance to Hiring Manager interview loop.",
    },
  },
  {
    id: "mandate",
    name: "Smart Mandate & JD Drafter",
    description:
      "Generates structured, inclusive job descriptions and market-calibrated salary benchmarks from minimal inputs in under 10 seconds.",
    tag: "Mandate Generation",
    icon: Bot,
    latency: "410ms • Gemini AI Engine",
    outputTitle: "Generated Mandate Spec: Principal Cloud Architect",
    preview: {
      badge: "Market Calibrated",
      summary: "Synthesized from 3 hiring manager bullet points into full inclusive mandate with market-indexed CTC benchmarks and 90-day retention reward terms.",
      keyPoints: [
        { label: "Suggested CTC Range", value: "₹50,00,000 - ₹72,00,000 Fixed + ESOP", status: "neutral" },
        { label: "Recommended Bounty", value: "₹1,50,000 (3.5% of CTC vs 20% Headhunter fee)", status: "success" },
        { label: "Inclusivity Index", value: "98/100 (Bias-free language verified)", status: "success" },
        { label: "SLA Review Window", value: "48-Hour Nudge rule auto-applied", status: "neutral" },
      ],
      footerNote: "Ready to publish to QuestEdge verified recruiter marketplace.",
    },
  },
  {
    id: "bgv",
    name: "AI-Assisted BGV Risk Evaluator",
    description:
      "Synthesizes multi-vendor background check reports with automated discrepancy detection, compliance flags, and advisory risk summaries.",
    tag: "Compliance & Safety",
    icon: ShieldCheck,
    latency: "520ms • Multi-Vendor Adapter",
    outputTitle: "BGV Executive Synthesis Report #BGV-401",
    preview: {
      badge: "Clear / Low Risk",
      summary: "Automated synthesis of identity registries, past employer PF filings, educational degree verifications, and civil registry searches across 3 vendors.",
      keyPoints: [
        { label: "Identity & Aadhaar", value: "Cryptographically verified with OTP consent", status: "success" },
        { label: "Past Employment", value: "3 of 3 tenures confirmed with zero discrepancies", status: "success" },
        { label: "Education Records", value: "B.Tech Computer Science degree verified", status: "success" },
        { label: "Court Registries", value: "0 civil or criminal records found nationwide", status: "success" },
      ],
      footerNote: "Full audit trail logged with DPDP Section 11 compliance.",
    },
  },
  {
    id: "offer",
    name: "Offer & Compensation Drafter",
    description:
      "Creates personalized, legally compliant offer letters with customized fixed/variable splits, ESOP vesting schedules, and joining bonus clauses.",
    tag: "Compensation Modeling",
    icon: FileSpreadsheet,
    latency: "380ms • Legal AI Template",
    outputTitle: "Custom Executive Offer Package",
    preview: {
      badge: "Legally Compliant",
      summary: "Calibrated executive offer letter with automated tax optimization, 4-year ESOP vesting schedule with 1-year cliff, and performance retention clauses.",
      keyPoints: [
        { label: "Fixed Base Pay", value: "₹48,00,000 / year (Paid monthly)", status: "neutral" },
        { label: "Performance Bonus", value: "₹6,00,000 (Annual milestone achieved)", status: "neutral" },
        { label: "ESOP Grant", value: "0.20% equity over 4-year standard cliff", status: "success" },
        { label: "Joining Clawback", value: "12-month retention condition applied", status: "success" },
      ],
      footerNote: "Digital signature dispatch ready via encrypted candidate token.",
    },
  },
];

export function AIAgents() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("screening");
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const Icon = selectedAgent.icon;

  return (
    <section
      id="ai-agents"
      className="relative overflow-hidden bg-slate-900 py-24 sm:py-32"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.22),transparent)]" />
      <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Powered by Google Gemini AI Engine
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            AI talent engines built for precision hiring
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Automate screening, mandate drafting, and verification with purpose-built AI engines embedded directly into the referral hiring pipeline.
          </p>
        </div>

        {/* Interactive Split Playground Layout */}
        <div className="mt-16 grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: 4 Selectable Agent Cards */}
          <div
            role="tablist"
            aria-label="AI talent engines"
            className="lg:col-span-5 space-y-3.5"
          >
            {agents.map((agent) => {
              const AgentIcon = agent.icon;
              const isSelected = agent.id === selectedAgentId;

              return (
                <button
                  key={agent.id}
                  role="tab"
                  id={`agent-tab-${agent.id}`}
                  aria-selected={isSelected}
                  aria-controls={`agent-panel-${agent.id}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full text-left rounded-2xl p-4.5 border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? "border-indigo-500 bg-slate-800/90 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                      : "border-slate-800 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                      isSelected
                        ? "bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md"
                        : "bg-slate-700/60 text-slate-300"
                    }`}
                  >
                    <AgentIcon className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-slate-200"}`}>
                        {agent.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-indigo-400 shrink-0">
                        {agent.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Interactive Gemini Terminal Simulation */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAgent.id}
                role="tabpanel"
                id={`agent-panel-${selectedAgent.id}`}
                aria-labelledby={`agent-tab-${selectedAgent.id}`}
                aria-live="polite"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border border-slate-700/80 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden"
              >
                {/* Terminal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                      {selectedAgent.outputTitle}
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-950 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-300 border border-indigo-800/80">
                    {selectedAgent.latency}
                  </span>
                </div>

                {/* Terminal Body */}
                <div className="p-6 space-y-5">
                  {/* Summary & Badge */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                        Live Agent Evaluation Output
                      </span>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {selectedAgent.preview.summary}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                      {selectedAgent.preview.badge}
                    </span>
                  </div>

                  {/* Key Output Points Table */}
                  <div className="space-y-2.5 font-mono text-xs">
                    {selectedAgent.preview.keyPoints.map((point) => (
                      <div
                        key={point.label}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xl bg-slate-900/60 p-3 border border-slate-800/70"
                      >
                        <span className="text-slate-400 text-[11px]">{point.label}:</span>
                        <div className="flex items-center gap-1.5">
                          {point.status === "success" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                          {point.status === "warning" && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className={`text-[11px] font-bold ${
                            point.status === "success"
                              ? "text-emerald-300"
                              : point.status === "warning"
                              ? "text-amber-300"
                              : "text-slate-200"
                          }`}>
                            {point.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Terminal Footer Note */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 font-sans">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                      {selectedAgent.preview.footerNote}
                    </span>
                    <a
                      href="/auth/login?returnTo=/dashboard"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      <span>Try with Gemini</span>
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
