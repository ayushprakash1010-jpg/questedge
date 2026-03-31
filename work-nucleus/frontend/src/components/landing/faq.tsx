"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Work Nucleus?",
    answer:
      "Work Nucleus is an AI-powered HR tech platform designed to modernize your entire people operations. We're launching with a full-featured Hiring & Recruitment module, with more HR modules — onboarding, performance management, leave & attendance, and employee engagement — on the roadmap.",
  },
  {
    question: "What AI model does Work Nucleus use?",
    answer:
      "Work Nucleus is powered by Anthropic's Claude, one of the most capable and safe AI models available. Our AI agents handle JD generation, feedback summarization, candidate scoring, and communication drafting — with more agents planned for every HR module.",
  },
  {
    question: "How secure is my data?",
    answer:
      "We take security seriously. All data is encrypted at rest and in transit. We use Auth0 for enterprise-grade authentication. Your data is never used to train AI models. Full audit logging is available for compliance and oversight.",
  },
  {
    question: "Can I try Work Nucleus before committing?",
    answer:
      "Absolutely! Our Starter plan is free and includes 5 users, 3 hiring plans, and AI-powered job description generation. No credit card required. You can upgrade to Professional anytime.",
  },
  {
    question: "Which modules are available right now?",
    answer:
      "The Hiring & Recruitment module is available now with features like hiring plan builder, AI job descriptions, Kanban pipelines, AI feedback & scoring, analytics, interviewer training, and more. Additional HR modules are in active development.",
  },
  {
    question: "Does Work Nucleus replace my existing HR tools?",
    answer:
      "Work Nucleus is designed to be a comprehensive HR platform. You can start with hiring and expand as new modules launch. We are actively building integrations — Enterprise customers can work with us on custom onboarding for their existing tech stack.",
  },
  {
    question: "Can I customize the hiring pipeline stages?",
    answer:
      "Yes! The Kanban pipeline is fully customizable. You can define your own stages and configure the workflow to match your team's process.",
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
