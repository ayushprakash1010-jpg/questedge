"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, ClipboardList, Ticket, AlertTriangle, TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  totalOrgs: number;
  totalUsers: number;
  activeUsers: number;
  totalActivePlans: number;
  totalOpenTickets: number;
  orgsNeedingAttention: number;
  recentOrgs: { id: string; name: string; industry: string; createdAt: string }[];
}

export default function SupportDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/support/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data.</p>;

  const kpis = [
    { label: "Total Organizations", value: data.totalOrgs, icon: Building2, color: "text-blue-600" },
    { label: "Active Users", value: `${data.activeUsers} / ${data.totalUsers}`, icon: Users, color: "text-green-600" },
    { label: "Active Hiring Plans", value: data.totalActivePlans, icon: ClipboardList, color: "text-purple-600" },
    { label: "Open Tickets", value: data.totalOpenTickets, icon: Ticket, color: "text-orange-600" },
    { label: "Needs Attention", value: data.orgsNeedingAttention, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Dashboard</h1>
        <p className="text-muted-foreground">Cross-organization overview and health monitoring</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/support-admin/tickets/new"
              className="block rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Create New Ticket</p>
              <p className="text-sm text-muted-foreground">Log a new support issue for a client</p>
            </Link>
            <Link
              href="/support-admin/organizations"
              className="block rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium">View Organizations</p>
              <p className="text-sm text-muted-foreground">Browse and inspect client organizations</p>
            </Link>
            <Link
              href="/support-admin/metrics"
              className="block rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Support Metrics</p>
              <p className="text-sm text-muted-foreground">View SLA compliance and performance</p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recently Added Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/support-admin/organizations/${org.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.industry}</p>
                  </div>
                  <Badge variant="outline">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
