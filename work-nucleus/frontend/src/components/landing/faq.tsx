"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is QuestEdge?",
    answer: "QuestEdge is a referral-based hiring marketplace that connects companies with independent recruiters. Companies post hiring mandates and set referral rewards. Recruiters browse the marketplace and refer candidates from their trusted networks. Candidates receive a secure consent link before their profile is shared with any company.",
  },
  {
    question: "How does the referral reward system work?",
    answer: "Companies set a referral reward amount when posting a mandate — typically a fixed fee or a percentage of the candidate's annual CTC. When a referred candidate is hired and completes a defined tenure (e.g., 90 days), the reward is released to the recruiter's wallet. No hire = no payment.",
  },
  {
    question: "Who can become a recruiter on QuestEdge?",
    answer: "Any independent recruiter, talent consultant, or professional with a strong network in their domain can apply to join. We verify identity and professional background before granting marketplace access. A verified badge on your profile signals trust to companies and candidates.",
  },
  {
    question: "How does candidate consent work?",
    answer: "When a recruiter refers a candidate, the candidate receives a secure consent link via email. The link shows the full role details — company name, JD, salary range, and who referred them. The candidate can accept or decline. Their profile is only shared with the company after explicit acceptance.",
  },
  {
    question: "When do recruiters get paid?",
    answer: "Rewards are tracked as 'potential' when a candidate accepts the referral, 'pending' when the candidate is hired, and 'confirmed' once the tenure period is completed. Payment is processed to the recruiter's registered account within 7 business days of confirmation.",
  },
  {
    question: "What happens if a hired candidate leaves before the tenure period?",
    answer: "Each mandate specifies a tenure period (e.g., 90 days). If the candidate leaves before completing that period, the reward status moves to 'cancelled' and no payment is made. This protects companies from paying for short-tenure hires.",
  },
  {
    question: "Is my data safe and private as a candidate?",
    answer: "Absolutely. Your profile is never visible to companies without your explicit consent. You can review the full role details before deciding. If you decline, your information is not retained by the company. All data is encrypted at rest and in transit, with Auth0 enterprise-grade authentication.",
  },
  {
    question: "How is QuestEdge different from traditional recruitment agencies?",
    answer: "Traditional agencies charge large upfront retainers or flat percentages regardless of outcome. QuestEdge is performance-only — companies pay only on successful hires. Recruiters are independent professionals with real networks (not cold callers), and candidates get full transparency before any company sees their profile.",
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
