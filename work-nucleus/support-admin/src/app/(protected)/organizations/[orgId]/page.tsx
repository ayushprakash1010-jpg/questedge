"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, ClipboardList, Ticket, TrendingUp, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface OrgDetail {
  id: string;
  name: string;
  industry: string | null;
  createdAt: string;
  _count: { users: number; hiringPlans: number; candidates: number; supportTickets: number };
  activePlans: number;
  activeUsers: number;
  openTickets: number;
  latestHealth: {
    healthScore: number;
    activeUsers: number;
    hiringPlanCount: number;
    openRoles: number;
    fillRate: number;
    riskFlags: string[];
  } | null;
}

interface UserItem {
  id: string; name: string; email: string; role: string; isActive: boolean;
}

interface PlanItem {
  id: string; title: string; department: string; status: string; totalRoles: number; filledRoles: number;
  hiringManager: { name: string };
}

interface HealthMetric {
  metricDate: string; healthScore: number; activeUsers: number; fillRate: number; openRoles: number;
}

export default function OrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [health, setHealth] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users" | "plans" | "health">("overview");

  useEffect(() => {
    Promise.all([
      fetch(`/api/support/organizations/${orgId}`).then((r) => r.json()),
      fetch(`/api/support/organizations/${orgId}/users`).then((r) => r.json()),
      fetch(`/api/support/organizations/${orgId}/hiring-plans`).then((r) => r.json()),
      fetch(`/api/support/organizations/${orgId}/health`).then((r) => r.json()),
    ]).then(([orgData, usersData, plansData, healthData]) => {
      setOrg(orgData);
      setUsers(usersData.data || usersData);
      setPlans(plansData.data || plansData);
      setHealth(Array.isArray(healthData) ? healthData : []);
      setLoading(false);
    });
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!org) return <p className="text-muted-foreground">Organization not found.</p>;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users", label: `Users (${org._count.users})` },
    { key: "plans", label: `Hiring Plans (${org._count.hiringPlans})` },
    { key: "health", label: "Health History" },
  ] as const;

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    DRAFT: "bg-gray-100 text-gray-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/organizations">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> {org.name}
          </h1>
          <p className="text-muted-foreground">{org.industry || "No industry"} &middot; Since {new Date(org.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{org.activeUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold">{org.activePlans}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-bold">{org.openTickets}</p>
                </div>
                <Ticket className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className="text-2xl font-bold">{org.latestHealth?.healthScore ?? "N/A"}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          {org.latestHealth?.riskFlags && (org.latestHealth.riskFlags as string[]).length > 0 && (
            <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader><CardTitle className="text-base">Risk Flags</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(org.latestHealth.riskFlags as string[]).map((flag, i) => (
                  <Badge key={i} variant="destructive">{flag}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "users" && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{u.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4"><Badge variant="outline">{u.role}</Badge></td>
                      <td className="py-3">
                        <Badge className={u.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "plans" && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Department</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Progress</th>
                    <th className="pb-2">Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{p.title}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.department}</td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColor[p.status] || ""}>{p.status}</Badge>
                      </td>
                      <td className="py-3 pr-4">{p.filledRoles}/{p.totalRoles}</td>
                      <td className="py-3">{p.hiringManager?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "health" && (
        <Card>
          <CardHeader><CardTitle>Health Score Trend</CardTitle></CardHeader>
          <CardContent>
            {health.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={health}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metricDate" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
                  <Line type="monotone" dataKey="healthScore" stroke="#3b82f6" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">No health data available yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
