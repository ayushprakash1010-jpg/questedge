"use client";

import Link from "next/link";
import { Store, Users, FileText, Trophy } from "lucide-react";

export default function MarketplacePage() {
  const sections = [
    {
      href: "/marketplace/mandates",
      icon: FileText,
      title: "Mandates",
      description: "Browse all hiring mandates across every organization. Filter by status, org, and title.",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      href: "/marketplace/recruiters",
      icon: Users,
      title: "Recruiters",
      description: "View recruiter profiles, verify or deactivate accounts, and inspect referral history.",
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
    {
      href: "/marketplace/rewards",
      icon: Trophy,
      title: "Reward Tracking",
      description: "Monitor reward status across all referrals. Investigate disputes and ownership claims.",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Platform-wide overview of the Referral Hire Marketplace</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow hover:border-primary/40"
          >
            <div className={`mb-4 inline-flex rounded-lg ${s.bg} p-3`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <h2 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{s.title}</h2>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
