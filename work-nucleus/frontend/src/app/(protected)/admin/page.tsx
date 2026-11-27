"use client";

import Link from "next/link";
import {
  Users,
  Settings,
  FileText,
  Shield,
  BarChart3,
  Cpu,
  Star,
  Wallet,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useProfile } from "@/hooks/use-profile";

const adminLinks = [
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage users, roles, and permissions",
    roles: ["ADMIN"],
  },
  {
    title: "Organization Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "Scoring weights, pipeline defaults, preferences",
    roles: ["ADMIN"],
  },
  {
    title: "Audit Log",
    href: "/admin/audit-log",
    icon: Shield,
    description: "View all system activity and changes",
    roles: ["ADMIN"],
  },
  {
    title: "AI Cost Dashboard",
    href: "/admin/ai-cost",
    icon: Cpu,
    description: "Monitor 30-day Gemini token spend and anomalies",
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Analytics Reports",
    href: "/admin/reports",
    icon: BarChart3,
    description: "Custom HR & hiring reports, charts, and CSV exports",
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Appraisal Cycles",
    href: "/admin/appraisal/cycles",
    icon: Star,
    description: "Create cycles, monitor goals, and advance stages",
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Compensation & Budgets",
    href: "/compensation/team",
    icon: Wallet,
    description: "Cycle hike pools, team revisions, and simulator",
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Training Modules",
    href: "/training",
    icon: FileText,
    description: "Manage interviewer training content",
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Hiring Plans",
    href: "/hiring-plans",
    icon: ClipboardList,
    description: "Org headcount plans, stages, and JDs",
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Offers",
    href: "/offers",
    icon: Receipt,
    description: "Offer templates, approvals, and e-sign letters",
    roles: ["ADMIN", "HR"],
  },
];

export default function AdminPage() {
  const { profile } = useProfile();
  const visibleLinks = profile?.role
    ? adminLinks.filter((l) => l.roles.includes(profile.role!))
    : adminLinks;

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        subtitle="Manage your organization settings, governance, cycles, and team."
      />

      {profile?.role && !["ADMIN", "HR"].includes(profile.role) ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="py-6 text-sm text-amber-800">
            Admin Settings require ADMIN or HR permissions. Contact your organization administrator if you need elevated access.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="card-hover cursor-pointer h-full">
                <CardContent className="flex items-start gap-4 py-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100">
                    <link.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {link.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {link.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
