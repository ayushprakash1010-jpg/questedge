"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What AI model does Work Nucleus use?",
    answer:
      "Work Nucleus is powered by Anthropic's Claude, one of the most capable and safe AI models available. All six of our AI agents use Claude for tasks like JD generation, feedback summarization, candidate scoring, and communication drafting.",
  },
  {
    question: "How secure is my hiring data?",
    answer:
      "We take security seriously. All data is encrypted at rest and in transit. We use Auth0 for enterprise-grade authentication with MFA support. Your data is never used to train AI models, and we are SOC 2 compliant.",
  },
  {
    question: "Can I try Work Nucleus before committing?",
    answer:
      "Absolutely! Our Starter plan is free and includes 5 users, 3 hiring plans, and 50 AI credits per month. No credit card required. You can upgrade to Professional anytime.",
  },
  {
    question: "Does Work Nucleus integrate with my existing ATS?",
    answer:
      "Work Nucleus is designed as a complete hiring platform, but we offer API-based integrations for popular tools. Enterprise customers get custom integration support for their existing tech stack.",
  },
  {
    question: "What are AI credits?",
    answer:
      "AI credits are consumed when you use our AI agents — generating JDs, scoring candidates, summarizing feedback, etc. Each operation uses 1 credit. Starter gets 50/month, Professional gets 500/month, and Enterprise gets unlimited.",
  },
  {
    question: "Can I customize the hiring pipeline stages?",
    answer:
      "Yes! The Kanban pipeline is fully customizable. You can define your own stages, add custom fields, and configure automation rules for each stage transition.",
  },
  {
    question: "Do you support multiple organizations or departments?",
    answer:
      "Yes. Each organization can have multiple departments with separate hiring plans. Role-based access control (RBAC) ensures team members only see what they need to.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            FAQ
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-16 space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-indigo-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
