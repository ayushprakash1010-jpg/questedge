// =============================================================
// Mock Router — maps API request paths to mock data responses
// =============================================================
import { NextResponse } from "next/server";
import * as data from "./data";

type Params = URLSearchParams;

export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}

/** Try to match the request to a mock response. Returns null if no match. */
export function handleMockRequest(
  method: string,
  pathname: string,
  params: Params,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any,
): NextResponse | null {
  const m = method.toUpperCase();

  // ── Profile ────────────────────────────────────────────────
  if (pathname === "/api/profile" && m === "GET") {
    return json(data.PROFILE);
  }
  if (pathname === "/api/onboarding" && m === "POST") {
    return json({ ...data.PROFILE, isProvisioned: true });
  }

  // ── Admin Users ────────────────────────────────────────────
  const adminUserMatch = pathname.match(/^\/api\/admin\/users(?:\/([^/]+))?$/);
  if (adminUserMatch) {
    const userId = adminUserMatch[1];
    if (!userId) {
      if (m === "GET") {
        const page = int(params.get("page"), 1);
        const limit = 10;
        const all = data.USERS;
        return json({
          data: all.slice((page - 1) * limit, page * limit),
          meta: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) },
        });
      }
      if (m === "POST") {
        return json({ id: `usr-new-${Date.now()}`, ...body, isActive: true, createdAt: new Date().toISOString() }, 201);
      }
    } else {
      const user = data.USERS.find((u) => u.id === userId);
      if (!user) return json({ error: "Not found" }, 404);
      if (m === "PATCH") return json({ ...user, ...body });
      if (m === "DELETE") return json({ success: true });
      return json(user);
    }
  }

  // ── Admin Settings ─────────────────────────────────────────
  if (pathname === "/api/admin/settings") {
    if (m === "GET") return json(data.SETTINGS);
    if (m === "PATCH") return json({ settings: { ...data.SETTINGS.settings, ...body } });
  }

  // ── Admin Audit Log ────────────────────────────────────────
  if (pathname === "/api/admin/audit-log" && m === "GET") {
    const page = int(params.get("page"), 1);
    const limit = int(params.get("limit"), 25);
    const action = params.get("action");
    let entries = [...data.AUDIT_LOG];
    if (action) entries = entries.filter((e) => e.action === action);
    return json({
      data: entries.slice((page - 1) * limit, page * limit),
      meta: { total: entries.length, page, limit },
    });
  }

  // ── Hiring Plans ───────────────────────────────────────────
  if (pathname === "/api/hiring-plans/stats" && m === "GET") {
    const plans = data.HIRING_PLANS;
    return json({
      total: plans.length,
      active: plans.filter((p) => p.status === "ACTIVE").length,
      draft: plans.filter((p) => p.status === "DRAFT").length,
      completed: plans.filter((p) => p.status === "COMPLETED").length,
      totalRoles: plans.reduce((s, p) => s + p.totalRoles, 0),
      filledRoles: plans.reduce((s, p) => s + p.filledRoles, 0),
    });
  }

  if (pathname === "/api/hiring-plans" && (m === "GET" || m === "POST")) {
    if (m === "GET") {
      const page = int(params.get("page"), 1);
      const limit = int(params.get("limit"), 10);
      const status = params.get("status");
      const department = params.get("department");
      const quarter = params.get("quarter");
      let plans = [...data.HIRING_PLANS];
      if (status) plans = plans.filter((p) => p.status === status);
      if (department) plans = plans.filter((p) => p.department === department);
      if (quarter) plans = plans.filter((p) => `Q${p.quarter} ${p.year}` === quarter);
      return json({
        data: plans.slice((page - 1) * limit, page * limit),
        meta: { total: plans.length, page, limit, totalPages: Math.ceil(plans.length / limit) },
      });
    }
    if (m === "POST") {
      return json({ id: `hp-new-${Date.now()}`, ...body, filledRoles: 0, status: "DRAFT", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, 201);
    }
  }

  // ── Hiring Plan Detail / Edit / Delete / Clone ─────────────
  const hpMatch = pathname.match(/^\/api\/hiring-plans\/([^/]+)$/);
  if (hpMatch) {
    const plan = data.HIRING_PLANS.find((p) => p.id === hpMatch[1]);
    if (!plan) return json({ error: "Hiring plan not found" }, 404);
    if (m === "GET") return json(plan);
    if (m === "PATCH") return json({ ...plan, ...body, updatedAt: new Date().toISOString() });
    if (m === "DELETE") return json({ success: true });
  }

  const cloneMatch = pathname.match(/^\/api\/hiring-plans\/([^/]+)\/clone$/);
  if (cloneMatch && m === "POST") {
    const plan = data.HIRING_PLANS.find((p) => p.id === cloneMatch[1]);
    if (!plan) return json({ error: "Not found" }, 404);
    return json({ ...plan, id: `hp-clone-${Date.now()}`, title: `${plan.title} (Copy)`, status: "DRAFT", filledRoles: 0 }, 201);
  }

  // ── Job Descriptions ───────────────────────────────────────
  const jdMatch = pathname.match(/^\/api\/hiring-plans\/([^/]+)\/jd$/);
  if (jdMatch) {
    const planId = jdMatch[1];
    if (m === "GET") {
      if (params.get("versions") === "true") {
        const jd = data.JOB_DESCRIPTIONS[planId];
        return jd ? json([jd]) : json([]);
      }
      const jd = data.JOB_DESCRIPTIONS[planId];
      return jd ? json(jd) : json(null);
    }
    if (m === "POST") {
      // Simulate AI generation
      const existing = data.JOB_DESCRIPTIONS[planId];
      return json(existing || { id: `jd-new-${Date.now()}`, hiringPlanId: planId, version: 1, status: "DRAFT", generatedByAi: true, content: { title: "Generated JD", summary: "AI-generated job description...", responsibilities: ["Responsibility 1", "Responsibility 2"], qualifications: { required: ["Requirement 1"], preferred: ["Preferred 1"] }, aboutCompany: "About the company...", workMode: "Hybrid" }, createdAt: new Date().toISOString() }, 201);
    }
    if (m === "PATCH") return json({ ...(data.JOB_DESCRIPTIONS[planId] || {}), ...body });
    if (m === "PUT") return json({ ...(data.JOB_DESCRIPTIONS[planId] || {}), status: "APPROVED", approvedAt: new Date().toISOString() });
  }

  // ── Stages ─────────────────────────────────────────────────
  const stagesMatch = pathname.match(/^\/api\/hiring-plans\/([^/]+)\/stages$/);
  if (stagesMatch) {
    const planId = stagesMatch[1];
    const stages = data.STAGES[planId] || [];
    if (m === "GET") return json(stages);
    if (m === "POST") {
      const action = params.get("action");
      if (action === "default-template") return json(stages);
      if (action === "reorder") return json(stages);
      return json({ id: `stg-new-${Date.now()}`, hiringPlanId: planId, ...body, interviewers: [], _count: { applications: 0 } }, 201);
    }
    if (m === "PATCH") {
      const { stageId, ...update } = body || {};
      const stage = stages.find((s) => s.id === stageId);
      return json({ ...stage, ...update });
    }
    if (m === "DELETE") return json({ success: true });
  }

  // ── Pipeline ───────────────────────────────────────────────
  const pipelineMatch = pathname.match(/^\/api\/hiring-plans\/([^/]+)\/pipeline$/);
  if (pipelineMatch) {
    const planId = pipelineMatch[1];
    if (m === "GET") {
      if (params.get("stats") === "true") return json(data.getPipelineStats(planId));
      return json(data.getPipeline(planId));
    }
    if (m === "POST") {
      return json({ id: `app-new-${Date.now()}`, ...body, status: "ACTIVE", appliedAt: new Date().toISOString() }, 201);
    }
  }

  // ── Hiring Plan Decisions ──────────────────────────────────
  const hpDecMatch = pathname.match(/^\/api\/hiring-plans\/([^/]+)\/decisions$/);
  if (hpDecMatch && m === "GET") {
    const planId = hpDecMatch[1];
    const planApps = data.APPLICATIONS.filter((a) => a.hiringPlanId === planId).map((a) => a.id);
    const decisions = data.DECISIONS.filter((d) => planApps.includes(d.applicationId));
    return json(decisions);
  }

  // ── Applications ───────────────────────────────────────────
  const appMatch = pathname.match(/^\/api\/applications\/([^/]+)$/);
  if (appMatch) {
    const appId = appMatch[1];
    const detail = data.getApplicationDetail(appId);
    if (!detail) return json({ error: "Not found" }, 404);
    if (m === "GET") return json(detail);
    if (m === "POST") return json({ ...detail, status: "ACTIVE" }); // move
    if (m === "PATCH") return json({ ...detail, ...body }); // status update
  }

  // ── Feedback ───────────────────────────────────────────────
  const fbMatch = pathname.match(/^\/api\/applications\/([^/]+)\/feedback$/);
  if (fbMatch) {
    const appId = fbMatch[1];
    if (m === "GET") {
      if (params.get("matrix") === "true") {
        const feedbacks = data.FEEDBACKS.filter((f) => f.applicationId === appId);
        const skills = Array.from(new Set(feedbacks.flatMap((f) => f.skillRatings.map((r) => r.skill.name))));
        const interviewerMap = new Map(feedbacks.map((f) => [f.interviewerId, f.interviewer]));
        const interviewers = Array.from(interviewerMap.values());
        return json({ skills, interviewers, ratings: feedbacks.flatMap((f) => f.skillRatings.map((r) => ({ skill: r.skill.name, interviewer: f.interviewer.name, rating: r.rating }))) });
      }
      const feedbacks = data.FEEDBACKS.filter((f) => f.applicationId === appId);
      // Group by stage
      const grouped = Object.values(
        feedbacks.reduce<Record<string, { stage: typeof feedbacks[0]["stage"] & { stageOrder: number }; feedbacks: typeof feedbacks }>>((acc, f) => {
          const key = f.stageId;
          if (!acc[key]) acc[key] = { stage: f.stage, feedbacks: [] };
          acc[key].feedbacks.push(f);
          return acc;
        }, {}),
      );
      return json(grouped);
    }
    if (m === "POST") {
      const action = params.get("action");
      if (action === "summarize") {
        return json({ summary: { overallAssessment: "The candidate demonstrates strong technical capabilities with particular strengths in frontend development. Interview feedback has been consistently positive across stages.", keyStrengths: ["Strong React and TypeScript proficiency", "Good system design thinking", "Collaborative communication style", "Problem-solving under pressure"], areasOfConcern: ["May need guidance on large-scale architecture decisions", "Salary expectations slightly above range"], skillAnalysis: [{ skillName: "React", category: "TECHNICAL", averageRating: 4.5, assessment: "Above expectations" }, { skillName: "TypeScript", category: "TECHNICAL", averageRating: 4.5, assessment: "Strong" }, { skillName: "System Design", category: "TECHNICAL", averageRating: 4.0, assessment: "Meets expectations" }], recommendation: "Proceed with offer", confidence: "HIGH", riskFactors: ["Salary negotiation may be required", "60-day notice period"] } });
      }
      if (action === "score") {
        return json({ score: { score: 82, breakdown: [{ category: "Technical", score: 85, weight: 40, weightedScore: 34 }, { category: "Leadership", score: 75, weight: 25, weightedScore: 18.75 }, { category: "Behavioural", score: 80, weight: 20, weightedScore: 16 }, { category: "Communication", score: 88, weight: 15, weightedScore: 13.2 }], confidence: "HIGH", keyFactors: ["Strong technical scores", "Consistent positive feedback", "Good culture fit signals"] } });
      }
      if (action === "submit") {
        const feedbackId = params.get("feedbackId");
        const fb = data.FEEDBACKS.find((f) => f.id === feedbackId);
        return json({ ...fb, isSubmitted: true, submittedAt: new Date().toISOString() });
      }
      // Create/update draft
      return json({ id: `fb-new-${Date.now()}`, ...body, isSubmitted: false, createdAt: new Date().toISOString() }, 201);
    }
  }

  // ── Application Decision ───────────────────────────────────
  const decMatch = pathname.match(/^\/api\/applications\/([^/]+)\/decision$/);
  if (decMatch) {
    const appId = decMatch[1];
    const existing = data.DECISIONS.find((d) => d.applicationId === appId);
    if (m === "GET") return existing ? json(existing) : json({ error: "Not found" }, 404);
    if (m === "POST") {
      const action = params.get("action");
      if (action === "approve") return json({ ...existing, approvedBy: data.CURRENT_USER, approvedAt: new Date().toISOString() });
      if (action === "send") return json({ ...existing, communicationSent: true, communicationSentAt: new Date().toISOString() });
      return json({ id: `dec-new-${Date.now()}`, applicationId: appId, ...body, communicationSent: false, decidedBy: data.CURRENT_USER, createdAt: new Date().toISOString() }, 201);
    }
    if (m === "PATCH") return json({ ...existing, communicationDraft: body });
  }

  // ── Timeline ───────────────────────────────────────────────
  const timelineMatch = pathname.match(/^\/api\/applications\/([^/]+)\/timeline$/);
  if (timelineMatch && m === "GET") {
    return json(data.getTimeline(timelineMatch[1]));
  }

  // ── Candidates ─────────────────────────────────────────────
  if (pathname === "/api/candidates") {
    if (m === "GET") {
      const page = int(params.get("page"), 1);
      const limit = int(params.get("limit"), 10);
      return json({
        data: data.CANDIDATES.slice((page - 1) * limit, page * limit),
        meta: { total: data.CANDIDATES.length, page, limit, totalPages: Math.ceil(data.CANDIDATES.length / limit) },
      });
    }
    if (m === "POST") {
      return json({ id: `cand-new-${Date.now()}`, ...body, createdAt: new Date().toISOString() }, 201);
    }
  }

  // ── Skills Search ──────────────────────────────────────────
  if (pathname === "/api/skills/search" && m === "GET") {
    const q = (params.get("q") || "").toLowerCase();
    const results = data.SKILLS.filter((s) => s.name.toLowerCase().includes(q));
    return json(results);
  }

  // ── Training Modules ───────────────────────────────────────
  if (pathname === "/api/training-modules") {
    if (m === "GET") return json(data.TRAINING_MODULES);
    if (m === "POST") {
      const action = params.get("action");
      if (action === "seed") return json(data.TRAINING_MODULES);
      if (action === "complete") {
        const moduleId = params.get("moduleId");
        const mod = data.TRAINING_MODULES.find((t) => t.id === moduleId);
        return json({ ...mod, completed: true, completedAt: new Date().toISOString() });
      }
      return json({ id: `tm-new-${Date.now()}`, ...body, isDefault: false, completed: false, completedAt: null }, 201);
    }
  }

  // ── Analytics ──────────────────────────────────────────────
  if (pathname === "/api/analytics") {
    if (m === "GET") {
      const type = params.get("type") || "overview";
      const map: Record<string, unknown> = {
        overview: data.ANALYTICS.overview,
        funnel: data.ANALYTICS.funnel,
        "time-to-hire": data.ANALYTICS.timeToHire,
        cost: data.ANALYTICS.cost,
        interviewers: data.ANALYTICS.interviewers,
        progress: data.ANALYTICS.progress,
        sources: data.ANALYTICS.sources,
      };
      return json(map[type] || {});
    }
    if (m === "POST") {
      // AI insights
      return json({ insights: data.ANALYTICS.insights });
    }
  }

  // ── Notifications ──────────────────────────────────────────
  if (pathname === "/api/notifications") {
    if (m === "GET") {
      if (params.get("type") === "unread-count") {
        return json({ count: data.NOTIFICATIONS.filter((n) => !n.read).length });
      }
      const page = int(params.get("page"), 1);
      const limit = 20;
      let notifs = [...data.NOTIFICATIONS];
      if (params.get("unreadOnly") === "true") notifs = notifs.filter((n) => !n.read);
      return json({
        data: notifs.slice((page - 1) * limit, page * limit),
        meta: { total: notifs.length, page, limit },
      });
    }
    if (m === "POST") {
      return json({ success: true });
    }
  }

  // ── Search ─────────────────────────────────────────────────
  if (pathname === "/api/search" && m === "GET") {
    const q = (params.get("q") || "").toLowerCase();
    if (q.length < 2) return json({ candidates: [], hiringPlans: [] });
    return json({
      candidates: data.CANDIDATES
        .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({ id: c.id, name: c.name, email: c.email, currentRole: c.currentRole })),
      hiringPlans: data.HIRING_PLANS
        .filter((p) => p.title.toLowerCase().includes(q) || p.department.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p) => ({ id: p.id, title: p.title, department: p.department, status: p.status })),
    });
  }

  // ── Support Dashboard ─────────────────────────────────────────
  if (pathname === "/api/support/dashboard" && m === "GET") {
    return json(data.SUPPORT_DASHBOARD);
  }

  // ── Support Organizations ───────────────────────────────────
  const supportOrgDetailMatch = pathname.match(/^\/api\/support\/organizations\/([^/]+)$/);
  if (supportOrgDetailMatch) {
    const orgId = supportOrgDetailMatch[1];
    if (m === "GET") {
      const detail = data.ORG_DETAIL[orgId];
      if (detail) return json(detail);
      const org = data.SUPPORT_ORGANIZATIONS.find((o) => o.id === orgId);
      return org ? json({ ...org, activePlans: 0, activeUsers: 0, openTickets: 0, latestHealth: null, settings: null, _count: org._count }) : json({ error: "Not found" }, 404);
    }
  }

  const supportOrgUsersMatch = pathname.match(/^\/api\/support\/organizations\/([^/]+)\/users$/);
  if (supportOrgUsersMatch && m === "GET") {
    const orgId = supportOrgUsersMatch[1];
    const users = data.ORG_USERS[orgId] || [];
    return json({ data: users, meta: { total: users.length, page: 1, limit: 20, totalPages: 1 } });
  }

  const supportOrgPlansMatch = pathname.match(/^\/api\/support\/organizations\/([^/]+)\/hiring-plans$/);
  if (supportOrgPlansMatch && m === "GET") {
    const orgId = supportOrgPlansMatch[1];
    const plans = data.ORG_HIRING_PLANS[orgId] || [];
    return json({ data: plans, meta: { total: plans.length, page: 1, limit: 20, totalPages: 1 } });
  }

  const supportOrgHealthMatch = pathname.match(/^\/api\/support\/organizations\/([^/]+)\/health$/);
  if (supportOrgHealthMatch && m === "GET") {
    const orgId = supportOrgHealthMatch[1];
    return json(data.ORG_HEALTH_METRICS[orgId] || []);
  }

  if (pathname === "/api/support/organizations" && m === "GET") {
    const page = int(params.get("page"), 1);
    const limit = int(params.get("limit"), 20);
    const search = params.get("search");
    let orgs = [...data.SUPPORT_ORGANIZATIONS];
    if (search) orgs = orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));
    return json({
      data: orgs.slice((page - 1) * limit, page * limit),
      meta: { total: orgs.length, page, limit, totalPages: Math.ceil(orgs.length / limit) },
    });
  }

  // ── Support Tickets ─────────────────────────────────────────
  const ticketDetailMatch = pathname.match(/^\/api\/support\/tickets\/([^/]+)$/);
  if (ticketDetailMatch) {
    const ticketId = ticketDetailMatch[1];
    const ticket = data.SUPPORT_TICKETS.find((t) => t.id === ticketId);
    if (!ticket) return json({ error: "Not found" }, 404);
    if (m === "GET") return json(ticket);
    if (m === "PATCH") return json({ ...ticket, ...body });
  }

  const ticketNotesMatch = pathname.match(/^\/api\/support\/tickets\/([^/]+)\/notes$/);
  if (ticketNotesMatch && m === "POST") {
    return json({ id: `note-new-${Date.now()}`, ...body, createdAt: new Date().toISOString(), author: { id: "sup-001", name: "Ravi Support" } }, 201);
  }

  const ticketResolveMatch = pathname.match(/^\/api\/support\/tickets\/([^/]+)\/resolve$/);
  if (ticketResolveMatch && m === "POST") {
    const ticket = data.SUPPORT_TICKETS.find((t) => t.id === ticketResolveMatch[1]);
    return json({ ...ticket, status: "RESOLVED", resolvedAt: new Date().toISOString() });
  }

  const ticketCloseMatch = pathname.match(/^\/api\/support\/tickets\/([^/]+)\/close$/);
  if (ticketCloseMatch && m === "POST") {
    const ticket = data.SUPPORT_TICKETS.find((t) => t.id === ticketCloseMatch[1]);
    return json({ ...ticket, status: "CLOSED", closedAt: new Date().toISOString() });
  }

  const ticketEscalateMatch = pathname.match(/^\/api\/support\/tickets\/([^/]+)\/escalate$/);
  if (ticketEscalateMatch && m === "POST") {
    const ticket = data.SUPPORT_TICKETS.find((t) => t.id === ticketEscalateMatch[1]);
    return json({
      ticket: { ...ticket, status: "ESCALATED" },
      escalation: { id: `esc-new-${Date.now()}`, level: body?.level || "L2", reason: body?.reason || "", createdAt: new Date().toISOString(), escalatedBy: { id: "sup-001", name: "Ravi Support" } },
    });
  }

  const ticketAssignMatch = pathname.match(/^\/api\/support\/tickets\/([^/]+)\/assign$/);
  if (ticketAssignMatch && m === "POST") {
    const ticket = data.SUPPORT_TICKETS.find((t) => t.id === ticketAssignMatch[1]);
    return json({ ...ticket, status: "IN_PROGRESS", assignee: { id: body?.assigneeId, name: "Assigned Rep" } });
  }

  if (pathname === "/api/support/tickets") {
    if (m === "GET") {
      const page = int(params.get("page"), 1);
      const limit = int(params.get("limit"), 20);
      const status = params.get("status");
      const priority = params.get("priority");
      let tickets = [...data.SUPPORT_TICKETS];
      if (status) tickets = tickets.filter((t) => t.status === status);
      if (priority) tickets = tickets.filter((t) => t.priority === priority);
      return json({
        data: tickets.slice((page - 1) * limit, page * limit),
        meta: { total: tickets.length, page, limit, totalPages: Math.ceil(tickets.length / limit) },
      });
    }
    if (m === "POST") {
      const slaHours: Record<string, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
      const slaDeadline = new Date(Date.now() + (slaHours[body?.priority || "MEDIUM"] || 24) * 60 * 60 * 1000).toISOString();
      return json({
        id: `tkt-new-${Date.now()}`, ...body, status: "OPEN", slaDeadline,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        organization: data.SUPPORT_ORGANIZATIONS.find((o) => o.id === body?.orgId) || { id: body?.orgId, name: "Unknown" },
        assignee: null, _count: { notes: 0, escalations: 0 }, notes: [], escalations: [],
      }, 201);
    }
  }

  // ── Support Analytics ───────────────────────────────────────
  if (pathname === "/api/support/analytics" && m === "GET") {
    const type = params.get("type") || "ticket-volume";
    const map: Record<string, unknown> = {
      "ticket-volume": data.SUPPORT_ANALYTICS.ticketVolume,
      "response-time": data.SUPPORT_ANALYTICS.responseTime,
      "sla-compliance": data.SUPPORT_ANALYTICS.slaCompliance,
      "rep-performance": data.SUPPORT_ANALYTICS.repPerformance,
    };
    return json(map[type] || {});
  }

  // ── Support Sessions ────────────────────────────────────────
  if (pathname === "/api/support/sessions/active" && m === "GET") {
    return json(data.SUPPORT_SESSIONS.filter((s) => !s.endedAt));
  }

  const sessionDetailMatch = pathname.match(/^\/api\/support\/sessions\/([^/]+)$/);
  if (sessionDetailMatch) {
    const sessionId = sessionDetailMatch[1];
    if (m === "GET") {
      const session = data.SUPPORT_SESSIONS.find((s) => s.id === sessionId);
      return session ? json(session) : json({ error: "Not found" }, 404);
    }
    if (m === "POST") {
      // End session
      const session = data.SUPPORT_SESSIONS.find((s) => s.id === sessionId);
      return json({ ...session, endedAt: new Date().toISOString() });
    }
  }

  // Direct /end match
  const sessionEndMatch = pathname.match(/^\/api\/support\/sessions\/([^/]+)\/end$/);
  if (sessionEndMatch && m === "POST") {
    const session = data.SUPPORT_SESSIONS.find((s) => s.id === sessionEndMatch[1]);
    return json({ ...session, endedAt: new Date().toISOString() });
  }

  if (pathname === "/api/support/sessions") {
    if (m === "GET") {
      const page = int(params.get("page"), 1);
      const limit = int(params.get("limit"), 20);
      return json({
        data: data.SUPPORT_SESSIONS.slice((page - 1) * limit, page * limit),
        meta: { total: data.SUPPORT_SESSIONS.length, page, limit, totalPages: Math.ceil(data.SUPPORT_SESSIONS.length / limit) },
      });
    }
    if (m === "POST") {
      return json({
        id: `sess-new-${Date.now()}`, sessionType: "SHADOW", ...body,
        startedAt: new Date().toISOString(), endedAt: null, ipAddress: "10.0.0.1",
        supportUser: { id: "sup-001", name: "Ravi Support" },
        targetOrg: data.SUPPORT_ORGANIZATIONS.find((o) => o.id === body?.targetOrgId) || { id: body?.targetOrgId, name: "Unknown" },
        targetUser: body?.targetUserId ? { id: body.targetUserId, name: "Target User" } : null,
      }, 201);
    }
  }

  // ── Support Tools ───────────────────────────────────────────
  if (pathname === "/api/support/tools/export" && m === "POST") {
    return json({
      exportedAt: new Date().toISOString(),
      orgId: body?.orgId,
      orgName: data.SUPPORT_ORGANIZATIONS.find((o) => o.id === body?.orgId)?.name || "Unknown",
      dataTypes: body?.dataTypes || [],
      data: { organization: { id: body?.orgId, name: "Exported Org" }, users: data.USERS.slice(0, 3) },
    });
  }

  const featureFlagsMatch = pathname.match(/^\/api\/support\/tools\/feature-flags\/([^/]+)$/);
  if (featureFlagsMatch) {
    const orgId = featureFlagsMatch[1];
    if (m === "GET") {
      return json({ orgId, featureFlags: data.FEATURE_FLAGS[orgId] || {} });
    }
    if (m === "PATCH") {
      const current = data.FEATURE_FLAGS[orgId] || {};
      return json({ orgId, featureFlags: { ...current, ...body } });
    }
  }

  if (pathname === "/api/support/tools/bulk" && m === "POST") {
    return json({ action: body?.action || "unknown", affected: Math.floor(Math.random() * 10) + 1 });
  }

  return null; // no match
}

// ── Helpers ────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function int(val: string | null, fallback: number): number {
  if (val === null || val === "") return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}
