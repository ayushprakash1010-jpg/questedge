"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Users, TrendingUp, DollarSign } from "lucide-react";

interface DashboardStats {
  totalActivePlans: number;
  totalOpenRoles: number;
  filledThisQuarter: number;
  avgBudgetMin: number;
  avgBudgetMax: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/hiring-plans/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Stats will remain null
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const formatCurrency = (min: number, max: number) => {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    if (!min && !max) return "N/A";
    return `${fmt(min)} - ${fmt(max)}`;
  };

  const statCards = [
    {
      title: "Active Plans",
      value: stats?.totalActivePlans ?? 0,
      icon: ClipboardList,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Open Roles",
      value: stats?.totalOpenRoles ?? 0,
      icon: Users,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
    {
      title: "Filled This Quarter",
      value: stats?.filledThisQuarter ?? 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Avg Budget Range",
      value: stats ? formatCurrency(stats.avgBudgetMin, stats.avgBudgetMax) : "N/A",
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your hiring overview at a glance
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {card.title}
              </CardTitle>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
