"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  FileText,
  Kanban,
  MessageSquare,
  BarChart3,
  GraduationCap,
  Mail,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Hiring Plan Builder",
    description:
      "Create structured workforce plans with budgets, timelines, skill requirements, and team hierarchies — all in one place.",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: FileText,
    title: "AI Job Description Generator",
    description:
      "Generate compelling, bias-free job descriptions in seconds with Claude AI. Customize tone, format, and requirements.",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    icon: Kanban,
    title: "Kanban Interview Pipeline",
    description:
      "Drag-and-drop candidate tracking across customizable stages. Real-time visibility for the entire hiring team.",
    color: "from-indigo-500 to-cyan-500",
  },
  {
    icon: MessageSquare,
    title: "AI Feedback & Scoring",
    description:
      "Structured interview feedback with AI-powered summarization and automated candidate scoring across multiple dimensions.",
    color: "from-amber-500 to-amber-600",
  },
  {
    icon: Mail,
    title: "Smart Communications",
    description:
      "AI-drafted offer letters, rejection emails, and follow-ups. Professional, personalized, and on-brand — every time.",
    color: "from-indigo-600 to-indigo-700",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Real-time hiring metrics: time-to-fill, pipeline velocity, source effectiveness, diversity tracking, and team performance.",
    color: "from-cyan-500 to-indigo-500",
  },
  {
    icon: GraduationCap,
    title: "Interviewer Training",
    description:
      "Built-in training modules on structured interviewing, bias reduction, and legal compliance. Track completion and scores.",
    color: "from-indigo-400 to-cyan-400",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Platform Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to hire{" "}
            <span className="text-indigo-600">better</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Seven powerful modules working together to streamline your entire
            hiring process from planning to onboarding.
          </p>
        </div>

        {/* Feature Grid */}
        <motion.div
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50"
            >
              <div
                className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-sm`}
              >
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
