// =============================================================
// Mock Router — maps API request paths to mock data responses
// (Support Admin only)
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
      data: { organization: { id: body?.orgId, name: "Exported Org" }, users: (data.ORG_USERS[body?.orgId] || []).slice(0, 3) },
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
