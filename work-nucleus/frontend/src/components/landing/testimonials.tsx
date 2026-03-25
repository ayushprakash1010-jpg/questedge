"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "Work Nucleus cut our time-to-hire by 60%. The AI-generated JDs alone saved our HR team 10+ hours a week.",
    name: "Priya Sharma",
    title: "VP of People, ScaleUp Inc.",
    initials: "PS",
  },
  {
    quote:
      "The Kanban pipeline and automated scoring gave us visibility we never had. We went from guessing to data-driven hiring.",
    name: "Rahul Mehta",
    title: "Head of Talent, TechVista",
    initials: "RM",
  },
  {
    quote:
      "Finally, a platform that combines structured hiring with AI intelligence. The feedback summarizer is a game-changer for panel interviews.",
    name: "Ananya Reddy",
    title: "CHRO, GrowthMatrix",
    initials: "AR",
  },
];

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Loved by hiring teams
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
              className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              {/* Stars */}
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg
                    key={j}
                    className="h-4 w-4 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {t.name}
                  </div>
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
