# 06 — Implementation Roadmap

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## Overview

| Phase | Name | Scope | Effort Estimate | Target |
|-------|------|-------|----------------|--------|
| Phase 0 | Discovery & Planning | Repository audit, architecture, docs | DONE | |
| Phase 1 | Security Hardening | Remove debug endpoints, fix SecurityLog hash, backend security | 1-2 days | Before Phase 2 |
| Phase 2 | Core Portal Extension | Dashboard + Users + Marketplace (backend + frontend) | 4-6 days | Primary sprint |
| Phase 3 | Observability Layer | AI Operations + Audit/Security log + System Health | 2-3 days | Secondary sprint |
| Phase 4 | Polish & QA | ConfirmDialog polish, E2E tests, a11y audit | 1-2 days | Final sprint |
| Phase 5 | Deferred Features | Finance flows, advanced reporting, billing | Future | Post-launch |

Total MVP estimate: **~10-13 development days**

---

## Phase 1 — Security Hardening (Prerequisite)

Must be completed BEFORE implementing new admin features.

### Tasks

| Task | File | Effort |
|------|------|--------|
| P0-3: Remove debug endpoints | `mandates.controller.ts:59-77` | 30 min |
| P1-1: Fix SecurityLog hash equality check | `security.service.ts:82` | 1 hour |
| P0-1: Add rate limiting to AI cost internal endpoint | `main.ts`, `ai-cost.controller.ts` | 2 hours |
| P1-3: Add `@nestjs/throttler` global rate limiter | `main.ts`, `app.module.ts` | 2 hours |
| P2-1: Add production CORS origins | `main.ts` | 30 min |
| P2-2: Verify Auth0 claim namespace in Login Action matches strategy | Auth0 Dashboard + `auth0-jwt.strategy.ts` | 1 hour |

**Acceptance:** All P0 and P1 security findings resolved before Phase 2 starts.

---

## Phase 2 — Core Portal Extension

### 2A — Backend: New Endpoints

#### Sprint 2A-1: Platform Users API

New methods in `SupportService` or new `PlatformUsersService`:

```typescript
// GET /api/v1/support/users
// Query: page, limit, search (email/name), role, userType, isActive, orgId
async listUsers(query: ListUsersDto): Promise<PaginatedUsers>

// GET /api/v1/support/users/:userId
async getUserDetail(userId: string): Promise<UserDetail>

// PATCH /api/v1/support/users/:userId/deactivate
// Body: { reason: string }
// Requires SUPPORT_ADMIN role
async deactivateUser(userId: string, actorId: string, reason: string): Promise<void>

// PATCH /api/v1/support/users/:userId/activate
// Body: { reason: string }
// Requires SUPPORT_ADMIN role
async activateUser(userId: string, actorId: string, reason: string): Promise<void>
```

Estimated: 4 hours

#### Sprint 2A-2: Marketplace API

New `PlatformMarketplaceController`:

```typescript
// GET /api/v1/support/mandates
// GET /api/v1/support/mandates/:mandateId
// GET /api/v1/support/recruiters
// GET /api/v1/support/recruiters/:recruiterId
// PATCH /api/v1/support/recruiters/:recruiterId/verify   (SUPPORT_ADMIN)
// PATCH /api/v1/support/recruiters/:recruiterId/deactivate (SUPPORT_ADMIN)
// GET /api/v1/support/rewards
// GET /api/v1/support/claim-scopes
```

Estimated: 5 hours

#### Sprint 2A-3: Platform AI Cost API

```typescript
// GET /api/v1/support/ai-cost  (SUPPORT_ADMIN)
// Query: days (default 30), orgId (optional)
// Returns: { totalCalls, totalTokens, totalCostPaise, errorRate, byAgent[], byOrg[], byDay[] }

// GET /api/v1/support/ai-cost/logs (SUPPORT_ADMIN)
// Query: page, limit, orgId, agentName, status, from, to
```

Estimated: 3 hours

#### Sprint 2A-4: Platform Audit + Security Log API

```typescript
// GET /api/v1/support/audit-log  (SUPPORT_ADMIN)
// Query: page, limit, orgId, userId, action, entityType, from, to

// GET /api/v1/support/security-log  (SUPPORT_ADMIN)
// Query: page, limit, orgId, eventType, from, to

// GET /api/v1/support/security/verify-chain?orgId=...  (SUPPORT_ADMIN)
// Returns: { ok: boolean, brokenAtIndex: number, total: number }
```

Estimated: 2 hours

### 2B — Frontend: New Pages

#### Sprint 2B-1: Dashboard Extension

Extend `/` with:
- Add 3 new KPI cards: AI Cost (7d), Verified Recruiters, Active Mandates
- Add "Recent Admin Actions" section (SUPPORT_ADMIN only)

Estimated: 3 hours

#### Sprint 2B-2: Users Section

- `/users` page — cross-org user directory with search + filters
- `/users/[userId]` page — detail with Profile, Activity, Actions tabs
- `ConfirmDialog` component for deactivate/activate

Estimated: 6 hours

#### Sprint 2B-3: Marketplace Section

- `/marketplace/mandates` — mandate list with status/org filters
- `/marketplace/mandates/[id]` — detail view
- `/marketplace/recruiters` — recruiter list with verified/active filters
- `/marketplace/recruiters/[id]` — detail + verify/deactivate actions
- `/marketplace/rewards` — reward tracking list

Estimated: 8 hours

#### Sprint 2B-4: Sidebar Extension

Update `SupportSidebar` with new nav groups (Users, Marketplace sections), role-based visibility, and new link state active handling.

Estimated: 2 hours

---

## Phase 3 — Observability Layer

### 3A — AI Operations Section

- `/ai-operations` — AI cost dashboard with KPIs + chart + org breakdown table
- `/ai-operations/logs` — AI call log table with filters

Estimated: 5 hours (backend already done in 2A-3)

### 3B — Security Section

- `/security/audit-log` — platform audit log with filters
- `/security/security-log` — SecurityLog with chain verify button
- `/security/sessions` — moved from `/tools/sessions`

Estimated: 5 hours (backend already done in 2A-4)

### 3C — System Health Page

- `/system-health` — fetch `/health` and `/ai/health` on load, display status cards
- Link to pg-boss dashboard at `:3003`
- Last 10 failed `NotificationLog` entries

Estimated: 3 hours

---

## Phase 4 — Polish & QA

### Tasks

- ConfirmDialog component polishing (reason validation, error states)
- Empty state and error state for every new page
- Skeleton loaders for every new page
- Role-based rendering of action buttons (SUPPORT_ADMIN guards on UI)
- Cross-browser test (Chrome, Firefox, Safari)
- Screen reader test (VoiceOver or NVDA)
- Keyboard navigation test
- Performance: ensure all list queries use indexed columns only
- Docs: update `support-admin/README.md` with new routes and role requirements

Estimated: 2 days

---

## Phase 5 — Deferred

| Feature | Rationale for Deferral |
|---------|----------------------|
| Finance Operator role + reward payout approval | No payment integration exists yet; need external payout system first |
| Candidate PII right-to-erasure | Requires careful cascade deletes; legal review needed |
| BGV override tools | Low frequency; need vendor API integration first |
| Platform-level billing/subscription | Product has no billing system yet |
| Org suspension (full block) | High risk; requires Auth0 batch block; Phase 3 after legal sign-off |
| Advanced custom reporting | Report builder is org-scoped; platform-level is complex |
| Audit log retention policies | GDPR requirement; need legal guidance on retention period |
| Platform feature flag defaults | Need config management system |

---

## Dependency Map

```
Phase 1 (Security) 
    ↓ must complete before
Phase 2A (Backend APIs)
    ↓ parallel with
Phase 2B (Frontend Pages)
    ↓ feeds into
Phase 3 (Observability) — can overlap with Phase 2B
    ↓
Phase 4 (Polish & QA)
    ↓
Launch
```

---

## Risk Register (Summary)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Neon DB free tier runs out of storage | Medium | High | Monitor; upgrade if >400 MB used |
| Render backend cold start delays API responses | High | Medium | Add keep-alive ping; document expected latency |
| Auth0 free tier MAU limit hit (7,500) | Low | High | Monitor MAU; candidates/recruiters are separate connections |
| AI cost endpoint leaks cross-org data | Low | Critical | Strict role gate (SUPPORT_ADMIN) + orgId validation in service |
| Hash equality fix breaks existing chain verify | Low | Medium | Test chain verify in staging before deploying |

See `09-risk-register-and-test-plan.md` for full details.
