"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ticket, Clock, CheckCircle, TrendingUp, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

interface TicketVolume {
  trend: { month: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  total: number;
}

interface ResponseTimeItem {
  group: string;
  avgResponseHours: number;
  avgResolutionHours: number;
  ticketCount: number;
}

interface SlaCompliance {
  overall: { met: number; breached: number; total: number; complianceRate: number };
  byPriority: { priority: string; met: number; breached: number; total: number; complianceRate: number }[];
}

interface RepPerformance {
  id: string;
  name: string;
  email: string;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgResponseHours: number;
}

const PIE_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

export default function MetricsPage() {
  const [tab, setTab] = useState<"overview" | "sla" | "health" | "reps">("overview");
  const [volume, setVolume] = useState<TicketVolume | null>(null);
  const [responseTime, setResponseTime] = useState<ResponseTimeItem[]>([]);
  const [sla, setSla] = useState<SlaCompliance | null>(null);
  const [reps, setReps] = useState<RepPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/support/analytics?type=ticket-volume").then((r) => r.json()),
      fetch("/api/support/analytics?type=response-time").then((r) => r.json()),
      fetch("/api/support/analytics?type=sla-compliance").then((r) => r.json()),
      fetch("/api/support/analytics?type=rep-performance").then((r) => r.json()),
    ]).then(([vol, rt, slaData, repData]) => {
      setVolume(vol);
      setResponseTime(Array.isArray(rt) ? rt : []);
      setSla(slaData);
      setReps(Array.isArray(repData) ? repData : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "sla", label: "SLA Compliance" },
    { key: "reps", label: "Rep Performance" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Metrics</h1>
        <p className="text-muted-foreground">Performance analytics and SLA tracking</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{volume?.total || 0}</p>
              </div>
              <Ticket className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {responseTime.length > 0
                    ? Math.round(responseTime.reduce((s, r) => s + r.avgResponseHours, 0) / responseTime.length)
                    : 0}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className="text-2xl font-bold">{sla?.overall.complianceRate || 0}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Reps</p>
                <p className="text-2xl font-bold">{reps.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
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

      {tab === "overview" && volume && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Ticket Volume Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={volume.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volume.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>By Priority</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={volume.byPriority}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%" cy="50%"
                    outerRadius={100}
                    label={({ priority, count }) => `${priority}: ${count}`}
                  >
                    {volume.byPriority.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Response & Resolution Time by Priority</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" />
                  <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="avgResponseHours" fill="#3b82f6" name="Avg Response" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgResolutionHours" fill="#10b981" name="Avg Resolution" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "sla" && sla && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Overall SLA Compliance</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{sla.overall.complianceRate}%</p>
                  <p className="text-sm text-muted-foreground">Compliance Rate</p>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{sla.overall.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{sla.overall.met}</p>
                    <p className="text-sm text-muted-foreground">Met</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{sla.overall.breached}</p>
                    <p className="text-sm text-muted-foreground">Breached</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>SLA by Priority</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sla.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="met" stackId="a" fill="#10b981" name="Met" />
                  <Bar dataKey="breached" stackId="a" fill="#ef4444" name="Breached" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "reps" && (
        <Card>
          <CardHeader><CardTitle>Support Rep Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Rep</th>
                    <th className="pb-2 pr-4">Total Tickets</th>
                    <th className="pb-2 pr-4">Resolved</th>
                    <th className="pb-2 pr-4">Resolution Rate</th>
                    <th className="pb-2">Avg Response</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map((rep) => (
                    <tr key={rep.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{rep.name}</p>
                        <p className="text-xs text-muted-foreground">{rep.email}</p>
                      </td>
                      <td className="py-3 pr-4">{rep.totalTickets}</td>
                      <td className="py-3 pr-4">{rep.resolvedTickets}</td>
                      <td className="py-3 pr-4">
                        <Badge className={rep.resolutionRate >= 80 ? "bg-green-100 text-green-800" : rep.resolutionRate >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                          {rep.resolutionRate}%
                        </Badge>
                      </td>
                      <td className="py-3">{rep.avgResponseHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
