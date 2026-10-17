# 07 — API and Data Mapping

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Existing Backend Endpoints (Already Used by support-admin)

| HTTP | Endpoint | Role Gate | Returns | Prisma Model |
|------|----------|-----------|---------|--------------|
| GET | `/api/v1/support/dashboard` | SUPPORT_REP+ | `{ totalOrgs, activeUsers, activePlans, openTickets, criticalTickets, orgsNeedingAttention, recentOrgs[] }` | Organization, User, HiringPlan, SupportTicket, OrgHealthMetric |
| GET | `/api/v1/support/organizations` | SUPPORT_REP+ | Paginated `Organization[]` with health + ticket counts | Organization, OrgHealthMetric, SupportTicket |
| GET | `/api/v1/support/organizations/:orgId` | SUPPORT_REP+ | Full org detail + health + tickets | Organization, OrgHealthMetric |
| GET | `/api/v1/support/organizations/:orgId/users` | SUPPORT_REP+ | `User[]` (no passwords/tokens) | User |
| GET | `/api/v1/support/organizations/:orgId/hiring-plans` | SUPPORT_REP+ | `HiringPlan[]` | HiringPlan |
| GET | `/api/v1/support/organizations/:orgId/health` | SUPPORT_REP+ | `OrgHealthMetric[]` history | OrgHealthMetric |
| GET | `/api/v1/support/tickets` | SUPPORT_REP+ | Paginated `SupportTicket[]` | SupportTicket |
| POST | `/api/v1/support/tickets` | SUPPORT_REP+ | Created `SupportTicket` | SupportTicket |
| GET | `/api/v1/support/tickets/:id` | SUPPORT_REP+ | Full ticket detail + notes + escalations | SupportTicket, SupportNote, SupportEscalation |
| POST | `/api/v1/support/tickets/:id/notes` | SUPPORT_REP+ | Created `SupportNote` | SupportNote |
| PATCH | `/api/v1/support/tickets/:id/assign` | SUPPORT_REP+ | Updated ticket | SupportTicket |
| POST | `/api/v1/support/tickets/:id/escalate` | SUPPORT_REP+ | Created `SupportEscalation` | SupportEscalation |
| POST | `/api/v1/support/sessions/shadow` | SUPPORT_REP+ | Created `SupportSession` | SupportSession |
| POST | `/api/v1/support/sessions/impersonate` | SUPPORT_ADMIN | Created `SupportSession` | SupportSession |
| POST | `/api/v1/support/sessions/:id/end` | SUPPORT_REP+ | Updated `SupportSession` | SupportSession |
| GET | `/api/v1/support/sessions` | SUPPORT_REP+ | Paginated `SupportSession[]` | SupportSession |
| GET | `/api/v1/support/sessions/active` | SUPPORT_REP+ | Active `SupportSession[]` | SupportSession |
| GET | `/api/v1/support/analytics/ticket-volume` | SUPPORT_REP+ | Time-series ticket volume | SupportTicket |
| GET | `/api/v1/support/analytics/response-time` | SUPPORT_REP+ | Avg response/resolution times | SupportTicket |
| GET | `/api/v1/support/analytics/sla-compliance` | SUPPORT_REP+ | SLA compliance percentages | SupportTicket |
| GET | `/api/v1/support/analytics/org-health` | SUPPORT_REP+ | All orgs health scores | OrgHealthMetric |
| GET | `/api/v1/support/analytics/rep-performance` | SUPPORT_REP+ | Per-rep ticket metrics | SupportTicket, User |
| POST | `/api/v1/support/analytics/compute-health` | SUPPORT_ADMIN | Trigger health recompute | OrgHealthMetric |
| GET | `/api/v1/support/tools/feature-flags/:orgId` | SUPPORT_REP+ | `{ featureFlags: Record<string, boolean> }` | OrgSettings |
| PATCH | `/api/v1/support/tools/feature-flags/:orgId` | SUPPORT_ADMIN | Updated feature flags | OrgSettings |
| POST | `/api/v1/support/tools/export-data` | SUPPORT_ADMIN | Data export payload | Multiple |
| POST | `/api/v1/support/tools/bulk-action` | SUPPORT_ADMIN | `{ action, affected }` | Multiple |

---

## 2. New Endpoints Required (Phase 2 & 3)

### 2.1 Platform Users

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/users` | SUPPORT_REP+ | `prisma.user.findMany({ where: { AND: [searchFilter] }, include: { organization: true }, orderBy: { createdAt: 'desc' } })` |
| GET | `/api/v1/support/users/:userId` | SUPPORT_REP+ | `prisma.user.findUnique({ where: { id }, include: { organization: true } })` |
| PATCH | `/api/v1/support/users/:userId/deactivate` | SUPPORT_ADMIN | `prisma.user.update({ where: { id }, data: { isActive: false } })` + AuditLog |
| PATCH | `/api/v1/support/users/:userId/activate` | SUPPORT_ADMIN | `prisma.user.update({ where: { id }, data: { isActive: true } })` + AuditLog |

**Query params for GET /users:**
```
page: number (default 1)
limit: number (default 20)
search: string (icontains on name or email)
role: Role (optional)
userType: UserType (optional)
isActive: boolean (optional)
orgId: string (optional UUID)
```

**Response shape for user list item:**
```json
{
  "id": "uuid",
  "name": "Priya Sharma",
  "email": "priya@acme.com",
  "role": "ADMIN",
  "userType": "COMPANY_ADMIN",
  "isActive": true,
  "orgId": "uuid",
  "orgName": "Acme Corp",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-08-20T14:30:00Z"
}
```

Important: NEVER return `auth0Sub`, password-like fields, or tokens in list responses.

### 2.2 Platform Marketplace

#### Mandates

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/mandates` | SUPPORT_REP+ | `prisma.mandate.findMany({ include: { organization: { select: { name: true } }, _count: { select: { participations: true, referrals: true, applications: true } } } })` |
| GET | `/api/v1/support/mandates/:mandateId` | SUPPORT_REP+ | Full mandate detail with counts |

**Query params:**
```
page, limit, status (MandateStatus), orgId, search (title)
```

**Response shape (mandate list item):**
```json
{
  "id": "uuid",
  "title": "Senior React Developer",
  "orgId": "uuid",
  "orgName": "Acme Corp",
  "status": "ACTIVE",
  "participationType": "OPEN",
  "referralRewardAmount": 15000.00,
  "numberOfOpenings": 3,
  "participationCount": 12,
  "referralCount": 45,
  "applicationCount": 8,
  "publishedAt": "2026-09-01T00:00:00Z",
  "createdAt": "2026-08-25T00:00:00Z"
}
```

#### Recruiters

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/recruiters` | SUPPORT_REP+ | `prisma.recruiterProfile.findMany({ include: { _count: { select: { referrals: true, rewards: true, participations: true } } } })` |
| GET | `/api/v1/support/recruiters/:recruiterId` | SUPPORT_REP+ | Full profile + rewards + referrals |
| PATCH | `/api/v1/support/recruiters/:recruiterId/verify` | SUPPORT_ADMIN | `prisma.recruiterProfile.update({ data: { isVerified: true, verifiedAt: new Date() } })` + AuditLog |
| PATCH | `/api/v1/support/recruiters/:recruiterId/deactivate` | SUPPORT_ADMIN | `prisma.recruiterProfile.update({ data: { isActive: false } })` + AuditLog |

**Response shape (recruiter list item):**
```json
{
  "id": "uuid",
  "name": "Rahul Gupta",
  "email": "rahul@freelancer.com",
  "headline": "Ex-Google recruiter, 8 years",
  "specializations": ["Engineering", "Product"],
  "experienceYears": 8,
  "isVerified": true,
  "verifiedAt": "2026-06-15T00:00:00Z",
  "isActive": true,
  "referralCount": 34,
  "activeRewardCount": 5,
  "createdAt": "2026-03-01T00:00:00Z"
}
```

#### Rewards

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/rewards` | SUPPORT_REP+ | `prisma.rewardTracking.findMany({ include: { recruiter: { select: { name: true, email: true } }, referral: { include: { mandate: { select: { title: true, organization: { select: { name: true } } } }, candidateProfile: { select: { name: true, email: true } } } } } })` |

**Query params:**
```
page, limit, status (RewardStatus), orgId, recruiterId, from, to
```

#### Claim Scopes

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/claim-scopes` | SUPPORT_REP+ | `prisma.claimScope.findMany(...)` with status filter |

### 2.3 Platform AI Cost

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/ai-cost` | SUPPORT_ADMIN | `prisma.aiCallLog.aggregate` + groupBy agentName + groupBy orgId |
| GET | `/api/v1/support/ai-cost/logs` | SUPPORT_ADMIN | `prisma.aiCallLog.findMany(...)` paginated |

**Response shape (AI cost dashboard):**
```json
{
  "period": { "from": "2026-09-17", "to": "2026-10-17" },
  "totalCalls": 4823,
  "totalTokensInput": 12400000,
  "totalTokensOutput": 3200000,
  "totalCostPaise": 284000,
  "errorRate": 0.02,
  "byAgent": [
    { "agentName": "jd_generator", "calls": 1200, "costPaise": 80000 }
  ],
  "byOrg": [
    { "orgId": "uuid", "orgName": "Acme Corp", "calls": 340, "costPaise": 25000 }
  ],
  "byDay": [
    { "date": "2026-10-16", "calls": 165, "costPaise": 9800 }
  ]
}
```

### 2.4 Platform Audit Log

| HTTP | Endpoint | Role Gate | Prisma Query |
|------|----------|-----------|--------------|
| GET | `/api/v1/support/audit-log` | SUPPORT_ADMIN | `prisma.auditLog.findMany({ where: { ...(orgId && { orgId }), ...(userId && { userId }), ...(action && { action: { contains: action, mode: 'insensitive' } }), ...(from && { createdAt: { gte: new Date(from) } }), ...(to && { createdAt: { lte: new Date(to) } }), }, orderBy: { createdAt: 'desc' }, take: limit, skip: (page-1)*limit })` |
| GET | `/api/v1/support/security-log` | SUPPORT_ADMIN | `prisma.securityLog.findMany(...)` similar pattern |
| GET | `/api/v2/support/security/verify-chain` | SUPPORT_ADMIN | Reuse SecurityService.verifyChain but accept orgId from query param |

**IMPORTANT:** The new platform audit log endpoint is distinct from the existing `GET /api/v1/admin/audit-log` which is org-scoped. The new endpoint must NOT have an `orgId` from the JWT — it must accept `orgId` as an optional filter and allow cross-org reads for SUPPORT_ADMIN.

---

## 3. Data Exclusions (Never Return These)

| Model | Fields to ALWAYS exclude |
|-------|------------------------|
| User | `auth0Sub`, any Auth0 token fields |
| Organization | Internal DB metadata not relevant to admin UI |
| OrgSettings | Raw `settings` JSON blob for sensitive keys (API credentials stored there) |
| SupportSession | actionsLog may contain PII — redact or limit to metadata |
| CandidateProfile | `phoneHash`, `emailHash`, `resumeUrl` (signed URL only) |
| RecruiterProfile | `auth0Sub` |
| AiCallLog | Raw prompt/completion text (not stored, but ensure it's never added) |

---

## 4. API Proxy Routes (support-admin Next.js → Backend)

New proxy route files needed in `support-admin/src/app/api/support/`:

| New Route | Maps to |
|-----------|---------|
| `api/support/users/route.ts` | `GET /api/v1/support/users` |
| `api/support/users/[userId]/route.ts` | `GET /api/v1/support/users/:userId` |
| `api/support/users/[userId]/deactivate/route.ts` | `PATCH /api/v1/support/users/:userId/deactivate` |
| `api/support/users/[userId]/activate/route.ts` | `PATCH /api/v1/support/users/:userId/activate` |
| `api/support/mandates/route.ts` | `GET /api/v1/support/mandates` |
| `api/support/mandates/[id]/route.ts` | `GET /api/v1/support/mandates/:id` |
| `api/support/recruiters/route.ts` | `GET /api/v1/support/recruiters` |
| `api/support/recruiters/[id]/route.ts` | `GET /api/v1/support/recruiters/:id` |
| `api/support/recruiters/[id]/verify/route.ts` | `PATCH /api/v1/support/recruiters/:id/verify` |
| `api/support/recruiters/[id]/deactivate/route.ts` | `PATCH /api/v1/support/recruiters/:id/deactivate` |
| `api/support/rewards/route.ts` | `GET /api/v1/support/rewards` |
| `api/support/claim-scopes/route.ts` | `GET /api/v1/support/claim-scopes` |
| `api/support/ai-cost/route.ts` | `GET /api/v1/support/ai-cost` |
| `api/support/ai-cost/logs/route.ts` | `GET /api/v1/support/ai-cost/logs` |
| `api/support/audit-log/route.ts` | `GET /api/v1/support/audit-log` |
| `api/support/security-log/route.ts` | `GET /api/v1/support/security-log` |
| `api/support/security/verify-chain/route.ts` | `GET /api/v2/support/security/verify-chain` |

All proxy routes follow the same pattern as existing routes:
1. Get access token via `auth0.getAccessToken()`
2. Forward request to `API_URL_INTERNAL + path`
3. Pipe response back to client
