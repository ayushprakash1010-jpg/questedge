"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, History, Database, Settings } from "lucide-react";
import Link from "next/link";

const tools = [
  {
    title: "Shadow Mode",
    description: "View the platform as a client user sees it (read-only). Useful for troubleshooting UI issues.",
    icon: Eye,
    href: "/support-admin/tools/shadow",
    color: "text-blue-600",
  },
  {
    title: "Session History",
    description: "View all shadow and impersonation sessions with full audit trail.",
    icon: History,
    href: "/support-admin/tools/sessions",
    color: "text-purple-600",
  },
  {
    title: "Bulk Operations",
    description: "Data exports, feature flag management, and bulk ticket operations.",
    icon: Database,
    href: "/support-admin/tools/bulk",
    color: "text-green-600",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Tools</h1>
        <p className="text-muted-foreground">Advanced tooling for client support operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <tool.icon className={`h-6 w-6 ${tool.color}`} />
                  <CardTitle className="text-base">{tool.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
