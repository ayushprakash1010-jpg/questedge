"use client";

import { motion } from "framer-motion";
import { Building2, Target, UserCircle } from "lucide-react";

const testimonials = [
  {
    quote: "We filled 3 senior engineering roles in 6 weeks with zero agency fees. The referral reward model means we only pay when someone actually joins and stays — it completely changed our cost-per-hire math.",
    name: "Ananya Reddy",
    title: "CHRO, GrowthMatrix",
    initials: "AR",
    role: "Company",
    icon: Building2,
    color: "from-indigo-500 to-indigo-600",
    accent: "text-indigo-600",
    badge: "bg-indigo-50 text-indigo-700",
  },
  {
    quote: "I earned ₹2.4L in my first month referring two candidates from my network. The mandate marketplace is the best tool I've used as a freelance recruiter — transparent, fast, and I actually get paid on time.",
    name: "Rahul Mehta",
    title: "Independent Tech Recruiter",
    initials: "RM",
    role: "Recruiter",
    icon: Target,
    color: "from-violet-500 to-violet-600",
    accent: "text-violet-600",
    badge: "bg-violet-50 text-violet-700",
  },
  {
    quote: "My recruiter submitted me with full transparency — I could see the company, the exact role, the salary band, and what the referral meant before I said yes. Best job-search experience I've ever had.",
    name: "Priya Sharma",
    title: "Software Engineer, hired via QuestEdge",
    initials: "PS",
    role: "Candidate",
    icon: UserCircle,
    color: "from-emerald-500 to-emerald-600",
    accent: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Success Stories
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Loved by every side of the marketplace
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all"
            >
              {/* Role badge */}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${t.badge}`}>
                <t.icon className="h-3 w-3" />
                {t.role}
              </span>

              {/* Stars */}
              <div className="mt-4 flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.title}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}