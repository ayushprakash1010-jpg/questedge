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
  ShieldCheck,
  Users,
  Calendar,
  Target,
  Briefcase,
} from "lucide-react";

const hiringFeatures = [
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
    title: "AI-Drafted Communications",
    description:
      "Generate offer letters and rejection emails with AI. Professional, personalized, and on-brand — saving hours of manual drafting.",
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
  {
    icon: ShieldCheck,
    title: "Admin Panel & Audit Logging",
    description:
      "Full admin dashboard with user management, organization settings, role-based access control, and detailed audit logs for compliance.",
    color: "from-slate-600 to-slate-700",
  },
];

const upcomingModules = [
  {
    icon: Users,
    title: "Employee Onboarding",
    description:
      "Streamline new hire onboarding with automated workflows, document collection, and task tracking.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Target,
    title: "Performance Management",
    description:
      "Set goals, track OKRs, conduct reviews, and provide continuous feedback — all powered by AI insights.",
    color: "from-violet-500 to-violet-600",
  },
  {
    icon: Calendar,
    title: "Leave & Attendance",
    description:
      "Manage time-off requests, track attendance, and automate leave policies across your organization.",
    color: "from-rose-500 to-rose-600",
  },
  {
    icon: Briefcase,
    title: "Employee Engagement",
    description:
      "Pulse surveys, sentiment analysis, and AI-driven insights to keep your team motivated and aligned.",
    color: "from-amber-500 to-orange-500",
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
            Platform Modules
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            One platform for{" "}
            <span className="text-indigo-600">all of HR</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Work Nucleus is a modular HR platform. Start with AI-powered hiring
            today — with more modules launching soon to cover your entire
            people operations.
          </p>
        </div>

        {/* Hiring Module */}
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700">
              Available Now
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Hiring & Recruitment
            </h3>
          </div>
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {hiringFeatures.map((feature) => (
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

        {/* Upcoming Modules */}
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-500">
              Coming Soon
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              More Modules on the Way
            </h3>
          </div>
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {upcomingModules.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="group relative rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 transition-all"
              >
                <div
                  className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-sm opacity-60`}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-700">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
