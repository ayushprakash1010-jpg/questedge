"use client";

import Link from "next/link";
import { Users, Settings, FileText, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

const adminLinks = [
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage users, roles, and permissions",
  },
  {
    title: "Organization Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "Scoring weights, pipeline defaults, preferences",
  },
  {
    title: "Audit Log",
    href: "/admin/audit-log",
    icon: Shield,
    description: "View all system activity and changes",
  },
  {
    title: "Training Modules",
    href: "/training",
    icon: FileText,
    description: "Manage interviewer training content",
  },
];

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin Panel"
        subtitle="Manage your organization settings and users."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="card-hover cursor-pointer">
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
    </div>
  );
}
