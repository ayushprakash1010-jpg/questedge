"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  MoreHorizontal,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HiringPlanSkill {
  id: string;
  skill: { id: string; name: string; category: string };
  priority: string;
  minProficiency: number;
}

interface HiringPlan {
  id: string;
  title: string;
  industry: string;
  department: string;
  quarter: number;
  year: number;
  totalRoles: number;
  filledRoles: number;
  status: string;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  designation: string;
  hiringManager: { id: string; name: string; email: string };
  skills: HiringPlanSkill[];
  createdAt: string;
}

interface PlansResponse {
  data: HiringPlan[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_OPTIONS = ["", "DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
const QUARTER_OPTIONS = ["", "1", "2", "3", "4"];

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function HiringPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<HiringPlan[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const fetchPlans = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (statusFilter) params.set("status", statusFilter);
        if (quarterFilter) params.set("quarter", quarterFilter);
        if (departmentFilter) params.set("department", departmentFilter);

        const res = await fetch(`/api/hiring-plans?${params}`);
        const data: PlansResponse = await res.json();
        setPlans(data.data || []);
        setMeta(data.meta || { total: 0, page: 1, totalPages: 1 });
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, quarterFilter, departmentFilter]
  );

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = () => setOpenMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openMenu]);

  const handleClone = async (id: string) => {
    setOpenMenu(null);
    await fetch(`/api/hiring-plans/${id}/clone`, { method: "POST" });
    fetchPlans(meta.page);
  };

  const handleDelete = async (id: string) => {
    setOpenMenu(null);
    if (!confirm("Cancel this hiring plan?")) return;
    await fetch(`/api/hiring-plans/${id}`, { method: "DELETE" });
    fetchPlans(meta.page);
  };

  const formatBudget = (min: string, max: string, currency: string) => {
    const fmt = (n: string) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(n));
    return `${fmt(min)} - ${fmt(max)}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hiring Plans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your hiring plans and positions
          </p>
        </div>
        <Link href="/hiring-plans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Plan
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-slate-200">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="w-36"
          >
            <option value="">All Quarters</option>
            {QUARTER_OPTIONS.filter(Boolean).map((q) => (
              <option key={q} value={q}>
                Q{q}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Department..."
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-48"
          />
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl shimmer"
            />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
              <ClipboardList className="h-7 w-7 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No hiring plans yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first hiring plan to get started
            </p>
            <Link href="/hiring-plans/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Department
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Period
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Roles
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Budget
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">
                  Manager
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr
                  key={plan.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/hiring-plans/${plan.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {plan.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {plan.industry}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {plan.department}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Q{plan.quarter} {plan.year}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900">
                        {plan.filledRoles}/{plan.totalRoles}
                      </span>
                      <Progress
                        value={plan.filledRoles}
                        max={plan.totalRoles}
                        className="w-16"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatBudget(plan.budgetMin, plan.budgetMax, plan.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        statusColors[plan.status] || ""
                      )}
                    >
                      {plan.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {plan.hiringManager?.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      ref={(el) => { menuBtnRefs.current[plan.id] = el; }}
                      className="rounded p-1 hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openMenu === plan.id) {
                          setOpenMenu(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
                          setOpenMenu(plan.id);
                        }
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-500">
                Showing {(meta.page - 1) * 20 + 1}-
                {Math.min(meta.page * 20, meta.total)} of {meta.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => fetchPlans(meta.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => fetchPlans(meta.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Portal dropdown menu */}
      {openMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-50 w-44 rounded-xl border border-slate-200/60 bg-white py-1.5 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                setOpenMenu(null);
                router.push(`/hiring-plans/${openMenu}`);
              }}
            >
              <Eye className="h-4 w-4" /> View
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                setOpenMenu(null);
                router.push(`/hiring-plans/${openMenu}/edit`);
              }}
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                const id = openMenu;
                setOpenMenu(null);
                handleClone(id);
              }}
            >
              <Copy className="h-4 w-4" /> Clone
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                const id = openMenu;
                setOpenMenu(null);
                handleDelete(id);
              }}
            >
              <Trash2 className="h-4 w-4" /> Cancel
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
