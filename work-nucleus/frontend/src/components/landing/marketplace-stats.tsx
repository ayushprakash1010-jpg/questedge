"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Clock, CheckCircle2, Award } from "lucide-react";

const valuePillars = [
  {
    icon: Award,
    value: "₹0",
    label: "Upfront Retainer",
    sub: "Pay bounties only on verified, tenured hires",
  },
  {
    icon: Clock,
    value: "48h",
    label: "Claim Exclusivity",
    sub: "Protected recruiter referral locks & duplicate shield",
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "Consent-First",
    sub: "Candidates review full details before profile sharing",
  },
  {
    icon: CheckCircle2,
    value: "5-Stage",
    label: "Milestone Security",
    sub: "Transparent tracking from submission to tenure payout",
  },
];

export function MarketplaceStats() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {valuePillars.map((pillar, i) => (
            <motion.div
              key={pillar.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-2xl font-extrabold text-white sm:text-3xl">
                {pillar.value}
              </div>
              <div className="mt-1 text-sm font-semibold text-indigo-100">{pillar.label}</div>
              <div className="mt-0.5 text-xs text-indigo-200/90">{pillar.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

