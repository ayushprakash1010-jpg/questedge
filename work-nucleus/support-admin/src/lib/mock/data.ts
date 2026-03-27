// =============================================================
// Mock Data for Work Nucleus Support Admin
// =============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export const PROFILE = {
  isProvisioned: true,
  id: "sup-001",
  email: "support@worknucleus.com",
  name: "Support Admin",
  role: "SUPPORT_ADMIN",
  avatarUrl: null,
  organization: { id: "org-internal", name: "Work Nucleus", industry: "Technology" },
};

// =============================================================
// SUPPORT PORTAL MOCK DATA
// =============================================================

export const SUPPORT_ORGANIZATIONS = [
  { id: "org-001", name: "Acme Technologies", industry: "Technology", createdAt: "2025-10-01T10:00:00Z", _count: { users: 7, hiringPlans: 3, supportTickets: 2 }, healthScore: 85, riskFlags: [] },
  { id: "org-002", name: "Meridian Healthcare", industry: "Healthcare", createdAt: "2025-11-15T10:00:00Z", _count: { users: 12, hiringPlans: 5, supportTickets: 1 }, healthScore: 72, riskFlags: ["Low fill rate"] },
  { id: "org-003", name: "Nova Financial", industry: "Finance", createdAt: "2025-09-20T10:00:00Z", _count: { users: 4, hiringPlans: 2, supportTickets: 4 }, healthScore: 45, riskFlags: ["High open ticket count", "Low user count"] },
  { id: "org-004", name: "GreenLeaf Retail", industry: "Retail", createdAt: "2026-01-05T10:00:00Z", _count: { users: 8, hiringPlans: 4, supportTickets: 0 }, healthScore: 92, riskFlags: [] },
  { id: "org-005", name: "TechVista Solutions", industry: "Technology", createdAt: "2026-02-10T10:00:00Z", _count: { users: 2, hiringPlans: 0, supportTickets: 3 }, healthScore: 30, riskFlags: ["No active hiring plans", "Low user count", "High open ticket count"] },
];

export const SUPPORT_DASHBOARD = {
  totalOrgs: 5,
  totalUsers: 33,
  activeUsers: 28,
  totalActivePlans: 10,
  totalOpenTickets: 8,
  orgsNeedingAttention: 2,
  recentOrgs: SUPPORT_ORGANIZATIONS.slice(0, 5).map((o) => ({ id: o.id, name: o.name, industry: o.industry, createdAt: o.createdAt })),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORG_DETAIL: Record<string, any> = {
  "org-001": {
    id: "org-001", name: "Acme Technologies", industry: "Technology", createdAt: "2025-10-01T10:00:00Z",
    _count: { users: 7, hiringPlans: 3, candidates: 15, supportTickets: 2 },
    activePlans: 2, activeUsers: 6, openTickets: 1,
    latestHealth: { healthScore: 85, activeUsers: 6, hiringPlanCount: 2, openRoles: 5, fillRate: 40, riskFlags: [] },
    settings: null,
  },
  "org-002": {
    id: "org-002", name: "Meridian Healthcare", industry: "Healthcare", createdAt: "2025-11-15T10:00:00Z",
    _count: { users: 12, hiringPlans: 5, candidates: 30, supportTickets: 1 },
    activePlans: 3, activeUsers: 10, openTickets: 0,
    latestHealth: { healthScore: 72, activeUsers: 10, hiringPlanCount: 3, openRoles: 12, fillRate: 25, riskFlags: ["Low fill rate"] },
    settings: null,
  },
  "org-003": {
    id: "org-003", name: "Nova Financial", industry: "Finance", createdAt: "2025-09-20T10:00:00Z",
    _count: { users: 4, hiringPlans: 2, candidates: 8, supportTickets: 4 },
    activePlans: 1, activeUsers: 3, openTickets: 3,
    latestHealth: { healthScore: 45, activeUsers: 3, hiringPlanCount: 1, openRoles: 4, fillRate: 20, riskFlags: ["High open ticket count", "Low user count"] },
    settings: null,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORG_USERS: Record<string, any[]> = {
  "org-001": [
    { id: "usr-001", email: "admin@acme.com", name: "Priya Sharma", role: "ADMIN", isActive: true, createdAt: "2025-12-01T10:00:00Z", auth0Sub: "auth0|mock-001" },
    { id: "usr-002", email: "hr@acme.com", name: "Rahul Mehta", role: "HR", isActive: true, createdAt: "2025-12-02T10:00:00Z", auth0Sub: "auth0|mock-002" },
    { id: "usr-003", email: "eng-mgr@acme.com", name: "Anita Desai", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-12-03T10:00:00Z", auth0Sub: "auth0|mock-003" },
    { id: "usr-004", email: "product-mgr@acme.com", name: "Vikram Joshi", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-12-04T10:00:00Z", auth0Sub: "auth0|mock-004" },
    { id: "usr-005", email: "interviewer@acme.com", name: "Sneha Patel", role: "INTERVIEWER", isActive: true, createdAt: "2025-12-05T10:00:00Z", auth0Sub: "auth0|mock-005" },
    { id: "usr-006", email: "viewer@acme.com", name: "Karan Singh", role: "VIEWER", isActive: true, createdAt: "2025-12-06T10:00:00Z", auth0Sub: "auth0|mock-006" },
    { id: "usr-007", email: "old-user@acme.com", name: "Neha Kapoor", role: "INTERVIEWER", isActive: false, createdAt: "2025-11-15T10:00:00Z", auth0Sub: "auth0|mock-007" },
  ],
  "org-002": [
    { id: "usr-m1", name: "Dr. Meena Reddy", email: "meena@meridian.com", role: "ADMIN", isActive: true, createdAt: "2025-11-15T10:00:00Z" },
    { id: "usr-m2", name: "Arun Kumar", email: "arun@meridian.com", role: "HR", isActive: true, createdAt: "2025-11-16T10:00:00Z" },
    { id: "usr-m3", name: "Sunita Verma", email: "sunita@meridian.com", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-11-17T10:00:00Z" },
    { id: "usr-m4", name: "Rajesh Gupta", email: "rajesh@meridian.com", role: "INTERVIEWER", isActive: true, createdAt: "2025-11-18T10:00:00Z" },
    { id: "usr-m5", name: "Priya Nair", email: "priya.n@meridian.com", role: "VIEWER", isActive: false, createdAt: "2025-12-01T10:00:00Z" },
  ],
  "org-003": [
    { id: "usr-n1", name: "Amit Shah", email: "amit@nova.com", role: "ADMIN", isActive: true, createdAt: "2025-09-20T10:00:00Z" },
    { id: "usr-n2", name: "Deepa Rao", email: "deepa@nova.com", role: "HR", isActive: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "usr-n3", name: "Nikhil Jain", email: "nikhil@nova.com", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-10-01T10:00:00Z" },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORG_HIRING_PLANS: Record<string, any[]> = {
  "org-001": [
    { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", status: "ACTIVE", totalRoles: 3, filledRoles: 1, hiringManager: { name: "Anita Desai" } },
    { id: "hp-002", title: "Product Manager — Growth", department: "Product", status: "ACTIVE", totalRoles: 2, filledRoles: 0, hiringManager: { name: "Vikram Joshi" } },
    { id: "hp-003", title: "Data Analyst Intern", department: "Data", status: "DRAFT", totalRoles: 1, filledRoles: 0, hiringManager: { name: "Anita Desai" } },
  ],
  "org-002": [
    { id: "hp-m1", title: "Senior Nurse Practitioner", department: "Nursing", status: "ACTIVE", totalRoles: 5, filledRoles: 1, hiringManager: { name: "Dr. Meena Reddy" } },
    { id: "hp-m2", title: "Lab Technician", department: "Pathology", status: "ACTIVE", totalRoles: 3, filledRoles: 0, hiringManager: { name: "Sunita Verma" } },
    { id: "hp-m3", title: "Hospital Administrator", department: "Admin", status: "DRAFT", totalRoles: 1, filledRoles: 0, hiringManager: { name: "Dr. Meena Reddy" } },
  ],
  "org-003": [
    { id: "hp-n1", title: "Risk Analyst", department: "Risk", status: "ACTIVE", totalRoles: 2, filledRoles: 0, hiringManager: { name: "Nikhil Jain" } },
    { id: "hp-n2", title: "Compliance Officer", department: "Compliance", status: "DRAFT", totalRoles: 1, filledRoles: 0, hiringManager: { name: "Amit Shah" } },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORG_HEALTH_METRICS: Record<string, any[]> = {
  "org-001": [
    { metricDate: "2025-10-01", healthScore: 60, activeUsers: 3, fillRate: 0, openRoles: 0 },
    { metricDate: "2025-11-01", healthScore: 70, activeUsers: 5, fillRate: 10, openRoles: 3 },
    { metricDate: "2025-12-01", healthScore: 75, activeUsers: 6, fillRate: 20, openRoles: 5 },
    { metricDate: "2026-01-01", healthScore: 80, activeUsers: 6, fillRate: 30, openRoles: 4 },
    { metricDate: "2026-02-01", healthScore: 82, activeUsers: 6, fillRate: 35, openRoles: 5 },
    { metricDate: "2026-03-01", healthScore: 85, activeUsers: 6, fillRate: 40, openRoles: 5 },
  ],
  "org-002": [
    { metricDate: "2025-11-15", healthScore: 50, activeUsers: 5, fillRate: 0, openRoles: 0 },
    { metricDate: "2025-12-01", healthScore: 60, activeUsers: 8, fillRate: 5, openRoles: 8 },
    { metricDate: "2026-01-01", healthScore: 65, activeUsers: 9, fillRate: 10, openRoles: 10 },
    { metricDate: "2026-02-01", healthScore: 70, activeUsers: 10, fillRate: 20, openRoles: 12 },
    { metricDate: "2026-03-01", healthScore: 72, activeUsers: 10, fillRate: 25, openRoles: 12 },
  ],
  "org-003": [
    { metricDate: "2025-10-01", healthScore: 65, activeUsers: 4, fillRate: 0, openRoles: 0 },
    { metricDate: "2025-11-01", healthScore: 55, activeUsers: 4, fillRate: 0, openRoles: 2 },
    { metricDate: "2025-12-01", healthScore: 50, activeUsers: 3, fillRate: 0, openRoles: 4 },
    { metricDate: "2026-01-01", healthScore: 48, activeUsers: 3, fillRate: 10, openRoles: 4 },
    { metricDate: "2026-02-01", healthScore: 45, activeUsers: 3, fillRate: 15, openRoles: 4 },
    { metricDate: "2026-03-01", healthScore: 45, activeUsers: 3, fillRate: 20, openRoles: 4 },
  ],
};

// ── Support Tickets ───────────────────────────────────────────
const SUP_USER = { id: "sup-001", name: "Ravi Support" };

export const SUPPORT_TICKETS = [
  {
    id: "tkt-001", orgId: "org-001", title: "Login issues for new employees", description: "Three new employees cannot log in after onboarding. Auth0 provisioning seems stuck.",
    status: "OPEN", priority: "HIGH", category: "TECHNICAL", reportedBy: "Priya Sharma", assigneeId: "sup-001",
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), firstResponseAt: null, resolvedAt: null, closedAt: null,
    tags: ["auth", "onboarding"], createdAt: "2026-03-25T10:00:00Z", updatedAt: "2026-03-25T10:00:00Z",
    organization: { id: "org-001", name: "Acme Technologies", industry: "Technology" },
    assignee: SUP_USER,
    _count: { notes: 2, escalations: 0 },
    notes: [
      { id: "note-001", content: "Checking Auth0 logs for failed provisioning events.", isInternal: true, createdAt: "2026-03-25T10:30:00Z", author: SUP_USER },
      { id: "note-002", content: "Found the issue — Auth0 connection was rate-limited. Resetting now.", isInternal: true, createdAt: "2026-03-25T11:00:00Z", author: SUP_USER },
    ],
    escalations: [],
  },
  {
    id: "tkt-002", orgId: "org-003", title: "Dashboard charts not loading", description: "Analytics dashboard shows blank charts. Console shows 500 errors from /api/analytics.",
    status: "IN_PROGRESS", priority: "CRITICAL", category: "BUG_REPORT", reportedBy: "Amit Shah", assigneeId: "sup-001",
    slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), firstResponseAt: "2026-03-24T15:00:00Z", resolvedAt: null, closedAt: null,
    tags: ["analytics", "bug"], createdAt: "2026-03-24T14:00:00Z", updatedAt: "2026-03-25T09:00:00Z",
    organization: { id: "org-003", name: "Nova Financial", industry: "Finance" },
    assignee: SUP_USER,
    _count: { notes: 3, escalations: 1 },
    notes: [
      { id: "note-003", content: "Investigating backend analytics service.", isInternal: true, createdAt: "2026-03-24T15:00:00Z", author: SUP_USER },
      { id: "note-004", content: "Hi Amit, we're looking into this. The analytics service had a temporary issue.", isInternal: false, createdAt: "2026-03-24T15:30:00Z", author: SUP_USER },
      { id: "note-005", content: "Root cause: missing index on candidate_applications causing query timeout.", isInternal: true, createdAt: "2026-03-25T09:00:00Z", author: SUP_USER },
    ],
    escalations: [
      { id: "esc-001", level: "L2", reason: "Query timeout causing 500 errors, requires DB optimization.", createdAt: "2026-03-24T18:00:00Z", resolvedAt: null, escalatedBy: SUP_USER },
    ],
  },
  {
    id: "tkt-003", orgId: "org-002", title: "Request to add custom pipeline stage", description: "Meridian wants to add a 'Background Check' stage between HR Round and Offer.",
    status: "WAITING_ON_CLIENT", priority: "MEDIUM", category: "FEATURE_REQUEST", reportedBy: "Arun Kumar", assigneeId: "sup-001",
    slaDeadline: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(), firstResponseAt: "2026-03-22T11:00:00Z", resolvedAt: null, closedAt: null,
    tags: ["pipeline", "feature"], createdAt: "2026-03-22T10:00:00Z", updatedAt: "2026-03-23T14:00:00Z",
    organization: { id: "org-002", name: "Meridian Healthcare", industry: "Healthcare" },
    assignee: SUP_USER,
    _count: { notes: 1, escalations: 0 },
    notes: [
      { id: "note-006", content: "Custom stages are already supported via CUSTOM stage type. Sent instructions to client.", isInternal: false, createdAt: "2026-03-22T11:00:00Z", author: SUP_USER },
    ],
    escalations: [],
  },
  {
    id: "tkt-004", orgId: "org-003", title: "Billing dispute - overcharged seats", description: "Nova Financial claims they were charged for 10 seats but only have 4 active users.",
    status: "ESCALATED", priority: "HIGH", category: "BILLING", reportedBy: "Deepa Rao", assigneeId: null,
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), firstResponseAt: "2026-03-23T10:00:00Z", resolvedAt: null, closedAt: null,
    tags: ["billing", "dispute"], createdAt: "2026-03-23T09:00:00Z", updatedAt: "2026-03-24T10:00:00Z",
    organization: { id: "org-003", name: "Nova Financial", industry: "Finance" },
    assignee: null,
    _count: { notes: 1, escalations: 1 },
    notes: [
      { id: "note-007", content: "Escalated to billing team for review.", isInternal: true, createdAt: "2026-03-23T10:00:00Z", author: SUP_USER },
    ],
    escalations: [
      { id: "esc-002", level: "L3", reason: "Billing dispute requires finance team review.", createdAt: "2026-03-23T10:30:00Z", resolvedAt: null, escalatedBy: SUP_USER },
    ],
  },
  {
    id: "tkt-005", orgId: "org-004", title: "Onboarding assistance for new team", description: "GreenLeaf added 3 new hiring managers. Need onboarding walkthrough.",
    status: "RESOLVED", priority: "LOW", category: "ONBOARDING", reportedBy: "Support Team", assigneeId: "sup-001",
    slaDeadline: "2026-03-25T10:00:00Z", firstResponseAt: "2026-03-20T11:00:00Z", resolvedAt: "2026-03-21T16:00:00Z", closedAt: null,
    tags: ["onboarding"], createdAt: "2026-03-20T10:00:00Z", updatedAt: "2026-03-21T16:00:00Z",
    organization: { id: "org-004", name: "GreenLeaf Retail", industry: "Retail" },
    assignee: SUP_USER,
    _count: { notes: 2, escalations: 0 },
    notes: [
      { id: "note-008", content: "Scheduled onboarding call for tomorrow.", isInternal: false, createdAt: "2026-03-20T11:00:00Z", author: SUP_USER },
      { id: "note-009", content: "Onboarding completed. All 3 managers are set up.", isInternal: false, createdAt: "2026-03-21T16:00:00Z", author: SUP_USER },
    ],
    escalations: [],
  },
  {
    id: "tkt-006", orgId: "org-005", title: "Cannot create hiring plan", description: "Getting validation error when trying to create first hiring plan. Fields seem correct.",
    status: "OPEN", priority: "MEDIUM", category: "BUG_REPORT", reportedBy: "admin@techvista.com", assigneeId: null,
    slaDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), firstResponseAt: null, resolvedAt: null, closedAt: null,
    tags: ["bug", "hiring-plans"], createdAt: "2026-03-25T14:00:00Z", updatedAt: "2026-03-25T14:00:00Z",
    organization: { id: "org-005", name: "TechVista Solutions", industry: "Technology" },
    assignee: null,
    _count: { notes: 0, escalations: 0 },
    notes: [],
    escalations: [],
  },
];

// ── Support Analytics ─────────────────────────────────────────
export const SUPPORT_ANALYTICS = {
  ticketVolume: {
    trend: [
      { month: "2025-10", count: 3 }, { month: "2025-11", count: 5 }, { month: "2025-12", count: 8 },
      { month: "2026-01", count: 6 }, { month: "2026-02", count: 10 }, { month: "2026-03", count: 12 },
    ],
    byCategory: [
      { category: "TECHNICAL", count: 12 }, { category: "BUG_REPORT", count: 8 },
      { category: "FEATURE_REQUEST", count: 6 }, { category: "BILLING", count: 4 },
      { category: "ONBOARDING", count: 10 }, { category: "GENERAL", count: 4 },
    ],
    byPriority: [
      { priority: "CRITICAL", count: 5 }, { priority: "HIGH", count: 12 },
      { priority: "MEDIUM", count: 18 }, { priority: "LOW", count: 9 },
    ],
    total: 44,
  },
  responseTime: [
    { group: "CRITICAL", avgResponseHours: 1, avgResolutionHours: 6, ticketCount: 5 },
    { group: "HIGH", avgResponseHours: 3, avgResolutionHours: 12, ticketCount: 12 },
    { group: "MEDIUM", avgResponseHours: 8, avgResolutionHours: 28, ticketCount: 18 },
    { group: "LOW", avgResponseHours: 18, avgResolutionHours: 52, ticketCount: 9 },
  ],
  slaCompliance: {
    overall: { met: 36, breached: 8, total: 44, complianceRate: 82 },
    byPriority: [
      { priority: "CRITICAL", met: 3, breached: 2, total: 5, complianceRate: 60 },
      { priority: "HIGH", met: 9, breached: 3, total: 12, complianceRate: 75 },
      { priority: "MEDIUM", met: 15, breached: 3, total: 18, complianceRate: 83 },
      { priority: "LOW", met: 9, breached: 0, total: 9, complianceRate: 100 },
    ],
  },
  repPerformance: [
    { id: "sup-001", name: "Ravi Support", email: "ravi@worknucleus.com", totalTickets: 28, resolvedTickets: 22, resolutionRate: 79, avgResponseHours: 4 },
    { id: "sup-002", name: "Meera Support Admin", email: "meera@worknucleus.com", totalTickets: 16, resolvedTickets: 14, resolutionRate: 88, avgResponseHours: 2 },
  ],
};

// ── Support Sessions ──────────────────────────────────────────
export const SUPPORT_SESSIONS = [
  {
    id: "sess-001", sessionType: "SHADOW", reason: "Investigating login issues reported by Acme",
    startedAt: "2026-03-25T10:00:00Z", endedAt: "2026-03-25T10:30:00Z", ipAddress: "10.0.0.1",
    supportUser: { id: "sup-001", name: "Ravi Support" },
    targetOrg: { id: "org-001", name: "Acme Technologies" },
    targetUser: { id: "usr-001", name: "Priya Sharma" },
  },
  {
    id: "sess-002", sessionType: "SHADOW", reason: "Checking analytics dashboard for Nova Financial",
    startedAt: "2026-03-24T14:00:00Z", endedAt: "2026-03-24T14:45:00Z", ipAddress: "10.0.0.1",
    supportUser: { id: "sup-001", name: "Ravi Support" },
    targetOrg: { id: "org-003", name: "Nova Financial" },
    targetUser: null,
  },
  {
    id: "sess-003", sessionType: "IMPERSONATE", reason: "Testing pipeline stage creation for TechVista",
    startedAt: "2026-03-25T15:00:00Z", endedAt: null, ipAddress: "10.0.0.2",
    supportUser: { id: "sup-002", name: "Meera Support Admin" },
    targetOrg: { id: "org-005", name: "TechVista Solutions" },
    targetUser: { id: "usr-tv1", name: "Admin User" },
  },
];

// ── Feature Flags ─────────────────────────────────────────────
export const FEATURE_FLAGS: Record<string, Record<string, boolean>> = {
  "org-001": { aiJdGeneration: true, aiInsights: true, advancedAnalytics: true, bulkCandidateImport: false, customPipelineStages: true, emailNotifications: true, slackIntegration: false, apiAccess: true },
  "org-002": { aiJdGeneration: true, aiInsights: false, advancedAnalytics: true, bulkCandidateImport: false, customPipelineStages: true, emailNotifications: true, slackIntegration: false, apiAccess: false },
  "org-003": { aiJdGeneration: true, aiInsights: true, advancedAnalytics: false, bulkCandidateImport: false, customPipelineStages: false, emailNotifications: true, slackIntegration: false, apiAccess: false },
  "org-004": { aiJdGeneration: true, aiInsights: true, advancedAnalytics: true, bulkCandidateImport: true, customPipelineStages: true, emailNotifications: true, slackIntegration: true, apiAccess: true },
  "org-005": { aiJdGeneration: false, aiInsights: false, advancedAnalytics: false, bulkCandidateImport: false, customPipelineStages: false, emailNotifications: true, slackIntegration: false, apiAccess: false },
};
