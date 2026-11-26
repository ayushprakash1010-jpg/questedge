"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { faqs, FAQ_CATEGORIES, type FaqCategoryId } from "@/lib/faq-data";

export function FAQ() {
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const visibleFaqs =
    activeCategory === "all"
      ? faqs
      : faqs.filter((faq) => faq.categories.includes(activeCategory));

  const handleCategoryChange = (categoryId: FaqCategoryId) => {
    setActiveCategory(categoryId);
    setOpenId(null);
  };

  return (
    <section id="faq" className="bg-white py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Frequently Asked Questions
          </span>
          <h2 id="faq-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to know about QuestEdge
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Learn how our referral marketplace, ownership locks, Gemini AI workflows, assessments, BGV, offers, and milestone-backed rewards work.
          </p>
        </div>

        {/* Audience & Topic Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter FAQ by topic"
          className="mt-10 flex flex-wrap justify-center gap-2"
        >
          {FAQ_CATEGORIES.map((category) => {
            const isSelected = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                id={`faq-tab-${category.id}`}
                aria-selected={isSelected}
                aria-controls="faq-accordion-list"
                onClick={() => handleCategoryChange(category.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div
          id="faq-accordion-list"
          role="tabpanel"
          aria-labelledby={`faq-tab-${activeCategory}`}
          className="mt-10 space-y-3"
        >
          {visibleFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-200 overflow-hidden transition-colors hover:border-slate-300"
              >
                <button
                  type="button"
                  id={`faq-btn-${faq.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${faq.id}`}
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-slate-900 focus-visible:outline-indigo-600"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-btn-${faq.id}`}
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
            );
          })}
        </div>

        {/* Contact fallback CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-600">
            Still have questions about mandates, bounties, or enterprise compliance?{" "}
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <span>Contact our team</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
