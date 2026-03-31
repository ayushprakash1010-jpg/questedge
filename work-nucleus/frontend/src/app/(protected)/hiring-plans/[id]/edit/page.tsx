"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HiringPlanForm } from "@/components/hiring-plans/hiring-plan-form";

export default function EditHiringPlanPage() {
  const params = useParams();
  const id = params.id as string;
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/hiring-plans/${id}`);
        const plan = await res.json();

        setInitialData({
          title: plan.title,
          industry: plan.industry,
          department: plan.department,
          designation: plan.designation,
          quarter: plan.quarter,
          year: plan.year,
          totalRoles: plan.totalRoles,
          reportingManagerName: plan.reportingManagerName,
          hodName: plan.hodName,
          teamSize: plan.teamSize,
          teamLevels: plan.teamLevels || "",
          hiringManagerId: plan.hiringManagerId,
          budgetMin: Number(plan.budgetMin),
          budgetMax: Number(plan.budgetMax),
          currency: plan.currency,
          benefits: plan.benefits || [],
          notes: plan.notes || "",
          skills: (plan.skills || []).map((s: any) => ({
            skillId: s.skill.id,
            name: s.skill.name,
            category: s.skill.category,
            priority: s.priority,
            minProficiency: s.minProficiency,
          })),
        });
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!initialData) {
    return <p className="text-center text-slate-500">Plan not found</p>;
  }

  return <HiringPlanForm initialData={initialData} planId={id} />;
}
