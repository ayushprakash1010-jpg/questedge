"use client";

import { motion } from "framer-motion";
import { Settings, Users, TrendingUp } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Settings,
    title: "Set Up Your Plan",
    description:
      "Define your hiring plan with roles, skills, budget, and timelines. Our AI suggests skills and helps structure your requirements.",
  },
  {
    step: "02",
    icon: Users,
    title: "Hire with AI Assistance",
    description:
      "Generate JDs, track candidates on Kanban boards, collect structured feedback, and let AI score and rank your pipeline automatically.",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Optimize & Decide",
    description:
      "Use real-time analytics to identify bottlenecks, draft communications with AI, and make data-driven hiring decisions faster.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Simple Process
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Up and running in minutes
          </h2>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-indigo-300 to-transparent lg:block" />
              )}

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/20">
                <s.icon className="h-7 w-7 text-white" />
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
                Step {s.step}
              </div>
              <h3 className="mt-3 text-xl font-bold text-slate-900">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
