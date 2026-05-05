"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  HiringPlanForm,
  type HiringPlanFormProps,
} from "@/components/hiring-plans/hiring-plan-form";
import { Spinner } from "@/components/ui/spinner";

interface PlanSkillFromApi {
  skill: { id: string; name: string; category: string };
  priority: string;
  minProficiency: number;
}

export default function EditHiringPlanPage() {
  const params = useParams();
  const id = params.id as string;
  const [initialData, setInitialData] = useState<
    HiringPlanFormProps["initialData"] | null
  >(null);
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
          teamSize: plan.teamSize ?? undefined,
          teamLevels: plan.teamLevels || "",
          hiringManagerId: plan.hiringManagerId,
          budgetMin: Number(plan.budgetMin),
          budgetMax: Number(plan.budgetMax),
          currency: plan.currency,
          benefits: plan.benefits || [],
          notes: plan.notes || "",
          skills: (plan.skills || []).map((s: PlanSkillFromApi) => ({
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
        <Spinner />
      </div>
    );
  }

  if (!initialData) {
    return <p className="text-center text-slate-500">Plan not found</p>;
  }

  return <HiringPlanForm initialData={initialData} planId={id} />;
}
