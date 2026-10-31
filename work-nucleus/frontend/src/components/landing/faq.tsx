"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is QuestEdge?",
    answer:
      "QuestEdge is an AI-powered referral hiring marketplace connecting companies with independent recruiters and talent networks. Companies publish open mandates with referral bounties, recruiters lock 48-hour exclusive claim scopes to refer vetted candidates, and candidates review and consent to roles before their information is shared.",
  },
  {
    question: "How does the referral reward lifecycle work?",
    answer:
      "Companies configure referral rewards when posting a mandate. Rewards transition through a 5-stage lifecycle: 'Potential' when candidate consent is given, 'Eligible' upon offer generation, 'Pending Approval' once the candidate joins, and 'Approved' after tenure completion (e.g., 90 days). Once approved, payouts are processed directly to the recruiter. No hire = zero cost.",
  },
  {
    question: "What is 48-Hour Claim Scope exclusivity?",
    answer:
      "A Claim Scope grants a recruiter exclusive rights for 48 hours to refer a specific candidate to an open mandate. Candidate email and phone hashes are checked to prevent duplicate submissions, eliminate recruiter disputes, and ensure the recruiter who brought the talent is protected.",
  },
  {
    question: "How does candidate consent work?",
    answer:
      "When a recruiter refers a candidate, the candidate receives an encrypted email invitation. The candidate reviews full details — company name, job description, compensation range, and the referring recruiter's note — before accepting. The candidate's contact info and resume are only revealed to the hiring team after explicit acceptance.",
  },
  {
    question: "How does the Gemini AI screening engine assist hiring teams?",
    answer:
      "QuestEdge leverages Google Gemini AI to analyze candidate resumes against mandate rubrics. It produces fit percentage scores, highlights technical strengths, and flags missing requirements so hiring teams can prioritize the highest-probability candidates first.",
  },
  {
    question: "How does QuestEdge protect candidate privacy and comply with data laws?",
    answer:
      "QuestEdge is built for full compliance with the Digital Personal Data Protection (DPDP) Act 2023 and GDPR Article 20. Phone numbers and emails are SHA-256 hashed for collision detection without exposing raw PII. Candidates have full self-service access to export their data package or invoke instant Right-to-be-Forgotten data scrubbing.",
  },
  {
    question: "What happens if a hired candidate leaves before completing tenure?",
    answer:
      "Each mandate specifies a tenure duration (typically 60 to 90 days). If a candidate resigns or is terminated before completing this period, the reward is cancelled, and the company is never billed for that hire.",
  },
  {
    question: "Who can register as a recruiter on QuestEdge?",
    answer:
      "Independent recruiters, specialized headhunters, and industry professionals with vetted domain networks can register for free. Verified recruiter profiles build trust with companies, gain access to higher bounty tiers, and unlock automated AI candidate matching.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-24 sm:py-32" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Frequently Asked Questions
          </span>
          <h2 id="faq-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to know about QuestEdge
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Learn how our referral marketplace, claim scopes, AI screening, and milestone-backed rewards work.
          </p>
        </div>

        <div className="mt-16 space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={faq.question}
              className="rounded-2xl border border-slate-200 overflow-hidden transition-colors hover:border-slate-300"
            >
              <button
                type="button"
                id={`faq-btn-${i}`}
                aria-expanded={openIndex === i}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-slate-900 focus-visible:outline-indigo-600"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </div>
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
