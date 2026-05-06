"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  MoreHorizontal,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, type PlanStatus } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/shared/data-table";
import { PlanDetailPanel } from "@/components/hiring-plans/plan-detail-panel";

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

const PAGE_SIZE = 20;
const PLAN_STATUSES: PlanStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
const VALID_STATUSES = new Set<string>(PLAN_STATUSES);

export default function HiringPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<HiringPlan[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const fetchPlans = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
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

  const handleClone = async (id: string) => {
    await fetch(`/api/hiring-plans/${id}/clone`, { method: "POST" });
    fetchPlans(meta.page);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this hiring plan?")) return;
    await fetch(`/api/hiring-plans/${id}`, { method: "DELETE" });
    if (selectedPlanId === id) setSelectedPlanId(null);
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
    // Break out of the protected layout's p-6 so the detail pane can sit flush
    // against the right edge — see design-system-v2/ui-kit/02-HiringPlans.html
    <div className="-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* List pane */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <PageHeader
            title="Hiring Plans"
            subtitle="Manage your hiring plans and positions"
            actions={
              <Link href="/hiring-plans/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create New Plan
                </Button>
              </Link>
            }
          />

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="">All Statuses</option>
                {PLAN_STATUSES.map((s) => (
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
                {["1", "2", "3", "4"].map((q) => (
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

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="block" className="h-16 w-full" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No hiring plans yet"
              description="Create your first hiring plan to get started"
              action={
                <Link href="/hiring-plans/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Create New Plan
                  </Button>
                </Link>
              }
            />
          ) : (
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Title</DataTableHead>
                  <DataTableHead>Department</DataTableHead>
                  <DataTableHead>Period</DataTableHead>
                  <DataTableHead>Roles</DataTableHead>
                  <DataTableHead>Budget</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Manager</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {plans.map((plan) => (
                  <DataTableRow
                    key={plan.id}
                    selected={selectedPlanId === plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <DataTableCell>
                      <div className="font-medium text-slate-900">{plan.title}</div>
                      <div className="text-xs text-slate-400">{plan.industry}</div>
                    </DataTableCell>
                    <DataTableCell>{plan.department}</DataTableCell>
                    <DataTableCell>
                      Q{plan.quarter} {plan.year}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {plan.filledRoles}/{plan.totalRoles}
                        </span>
                        <Progress
                          value={plan.filledRoles}
                          max={plan.totalRoles}
                          className="h-1.5 w-16"
                        />
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      {formatBudget(plan.budgetMin, plan.budgetMax, plan.currency)}
                    </DataTableCell>
                    <DataTableCell>
                      {VALID_STATUSES.has(plan.status) ? (
                        <StatusBadge status={plan.status as PlanStatus} />
                      ) : (
                        plan.status
                      )}
                    </DataTableCell>
                    <DataTableCell>{plan.hiringManager?.name}</DataTableCell>
                    <DataTableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[176px]">
                          <DropdownMenuItem
                            onClick={() => router.push(`/hiring-plans/${plan.id}`)}
                          >
                            <Eye className="h-4 w-4" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/hiring-plans/${plan.id}/edit`)
                            }
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleClone(plan.id)}>
                            <Copy className="h-4 w-4" /> Clone
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="danger"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
              <tfoot>
                <tr>
                  <td colSpan={8} className="p-0">
                    <DataTablePagination
                      page={meta.page}
                      pageSize={PAGE_SIZE}
                      total={meta.total}
                      onPageChange={(p) => fetchPlans(p)}
                    />
                  </td>
                </tr>
              </tfoot>
            </DataTable>
          )}
        </div>
      </div>

      {/* Detail pane */}
      {selectedPlanId && (
        <PlanDetailPanel
          key={selectedPlanId}
          planId={selectedPlanId}
          onClose={() => setSelectedPlanId(null)}
          onUpdated={() => fetchPlans(meta.page)}
        />
      )}
    </div>
  );
}
