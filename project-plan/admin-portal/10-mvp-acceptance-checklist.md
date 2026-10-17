# 10 — MVP Acceptance Checklist

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

This checklist must be completed in full before the admin portal is considered production-ready. Each item must be ticked off by the responsible party and verified by at least one other team member.

---

## Phase 1 — Security Hardening (Gate: Must complete before Phase 2)

### P0 Fixes

- [ ] **P0-3:** `GET /api/v1/mandates/test-ai` endpoint removed from `mandates.controller.ts`
- [ ] **P0-3:** `GET /api/v1/mandates/test-whatsapp` endpoint removed from `mandates.controller.ts`
- [ ] **P0-3:** Verified both removed endpoints return 404 in production
- [ ] **P0-1:** Rate limiting added to `POST /api/v2/ai-cost/internal/log` (≤ 60 req/min)
- [ ] **P0-2:** New platform-wide audit log endpoint planned and tracked (see Phase 3)

### P1 Fixes

- [ ] **P1-1:** `SecurityService.verifyChain` now compares `expected === row.hash` (not just `void expected`)
- [ ] **P1-1:** Existing security chain verified intact after fix deployment
- [ ] **P1-3:** `@nestjs/throttler` added to `AppModule` with global rate limit
- [ ] **P2-1:** Production CORS origins added to `main.ts` (`allowedOrigins` includes Vercel production URLs)
- [ ] **P2-2:** Auth0 Login Action namespace verified to be `https://api.questedge.com/` (matches `auth0-jwt.strategy.ts`)

---

## Phase 2 — Core Portal Extension

### Backend

- [ ] `GET /api/v1/support/users` implemented, paginated, with search and filters
- [ ] `GET /api/v1/support/users/:userId` implemented (no auth0Sub in response)
- [ ] `PATCH /api/v1/support/users/:userId/deactivate` implemented (SUPPORT_ADMIN, reason required, AuditLog)
- [ ] `PATCH /api/v1/support/users/:userId/activate` implemented (SUPPORT_ADMIN, reason required, AuditLog)
- [ ] `GET /api/v1/support/mandates` implemented, paginated, with status and orgId filters
- [ ] `GET /api/v1/support/mandates/:mandateId` implemented (read-only)
- [ ] `GET /api/v1/support/recruiters` implemented, paginated, with verified/active filters
- [ ] `GET /api/v1/support/recruiters/:recruiterId` implemented
- [ ] `PATCH /api/v1/support/recruiters/:recruiterId/verify` implemented (SUPPORT_ADMIN, AuditLog)
- [ ] `PATCH /api/v1/support/recruiters/:recruiterId/deactivate` implemented (SUPPORT_ADMIN, reason, AuditLog)
- [ ] `GET /api/v1/support/rewards` implemented (amounts hidden for SUPPORT_REP)
- [ ] `GET /api/v1/support/claim-scopes` implemented (read-only)
- [ ] `@@index([isVerified, isActive])` added to RecruiterProfile (migration applied)
- [ ] All new endpoints return 401 when no JWT
- [ ] All new endpoints return 403 when wrong role
- [ ] No `auth0Sub` field in any new response

### Frontend

- [ ] Dashboard (`/`) extended with AI cost (7d), Verified Recruiters, Active Mandates KPI cards
- [ ] Dashboard "Recent Admin Actions" section visible to SUPPORT_ADMIN only
- [ ] `SupportSidebar` updated with Users and Marketplace nav sections
- [ ] New nav sections hide `adminOnly` items for SUPPORT_REP
- [ ] `/users` page: search, role filter, userType filter, status filter, org filter working
- [ ] `/users` page: table shows Name, Email, Org, Role, UserType, Status with correct badges
- [ ] `/users/[userId]` page: Profile, Activity, Actions tabs
- [ ] `/users/[userId]` Deactivate button visible only for SUPPORT_ADMIN
- [ ] `/users/[userId]` Deactivate opens ConfirmDialog with reason field required
- [ ] `/users/[userId]` Confirm button disabled until reason has ≥ 10 characters
- [ ] `/marketplace/mandates` page: mandate list with status/org filters working
- [ ] `/marketplace/recruiters` page: recruiter list with verified/active filters working
- [ ] `/marketplace/recruiters/[id]` Verify button opens ConfirmDialog; AuditLog written
- [ ] `/marketplace/rewards` page: reward list with status filter working
- [ ] `ConfirmDialog` component reusable with reason, consequences, and variant props
- [ ] `StatusBadge` component covers all enums: MandateStatus, RewardStatus, Role, isActive, isVerified
- [ ] All new pages have loading skeleton state
- [ ] All new pages have empty state
- [ ] All new pages have error state with retry button

---

## Phase 3 — Observability Layer

### Backend

- [ ] `GET /api/v1/support/ai-cost` implemented (SUPPORT_ADMIN): total calls, tokens, cost, error rate, byAgent, byOrg, byDay
- [ ] `GET /api/v1/support/ai-cost/logs` implemented (SUPPORT_ADMIN): paginated AiCallLog with filters
- [ ] `GET /api/v1/support/audit-log` implemented (SUPPORT_ADMIN): cross-org, paginated, with orgId/action/date filters
- [ ] `GET /api/v1/support/security-log` implemented (SUPPORT_ADMIN): cross-org SecurityLog paginated
- [ ] `GET /api/v2/support/security/verify-chain` implemented (SUPPORT_ADMIN): accepts orgId query param

### Frontend

- [ ] `/ai-operations` page: 4 KPI cards, cost-by-agent chart (Recharts or table), cost-by-org table
- [ ] `/ai-operations/logs` page: paginated AiCallLog table with agent/org/status/date filters
- [ ] AI Operations sections hidden for SUPPORT_REP (nav item hidden, page shows access-restricted)
- [ ] `/security/audit-log` page: table with inline JSON expansion for `changes` field
- [ ] `/security/audit-log` org filter working
- [ ] `/security/security-log` page: chain integrity button calls verify-chain endpoint, shows result
- [ ] `/security/sessions` page: moved session history from `/tools/sessions`
- [ ] `/system-health` page: backend health card, AI service health card, pg-boss link, notification failures
- [ ] Security section hidden for SUPPORT_REP (nav item hidden, page shows access-restricted)
- [ ] Sidebar nav group "Platform" added with AI Operations, Metrics, Security, Tools, System Health

---

## Phase 4 — Polish & Quality

### Code Quality

- [ ] All new TypeScript files have no `any` types on public interfaces (use typed DTOs)
- [ ] All new NestJS service methods accept `actorId: string` for audit logging
- [ ] No hardcoded org IDs or user IDs in any source file
- [ ] All new components have descriptive `id` attributes on interactive elements
- [ ] `eslint` passes with no new errors
- [ ] `tsc --noEmit` passes on both backend and support-admin

### Functionality

- [ ] Keep-alive Vercel cron route deployed (`/api/cron/keep-alive`) pinging backend `/health` every 14 minutes
- [ ] Vercel `vercel.json` cron config present in support-admin project
- [ ] Support-admin environment variables audited and confirmed present in Vercel project settings

### Accessibility

- [ ] All new tables have `<th scope="col">` headers
- [ ] All modal/dialog components have `aria-modal="true"` and focus trapping
- [ ] All status badges have text content (not only color)
- [ ] Keyboard navigation works for sidebar (Tab, Enter, Space)
- [ ] Screen reader test passed (VoiceOver or NVDA) for dashboard, user list, recruiter list
- [ ] Color contrast ratio ≥ 4.5:1 for all text (verified with axe DevTools)

### Security Final Checklist

- [ ] Penetration-style test: send customer app JWT to support endpoint → confirm 403
- [ ] Verify no `auth0Sub` in any API response payload from new endpoints
- [ ] Verify AuditLog entry exists for every tested mutating action
- [ ] Verify SupportSession record created for shadow session test
- [ ] Verify `SecurityLog` hash chain intact after fix deployment

### Performance

- [ ] All new list queries verified to use indexed columns in WHERE clause
- [ ] Dashboard loads in < 3 seconds on warm Render instance (measured via browser DevTools)
- [ ] No N+1 queries in any new endpoint (verified by reviewing Prisma queries in new services)

### Documentation

- [ ] `support-admin/README.md` updated with new routes and role requirements
- [ ] `CLAUDE.md` updated: add note that AI service uses Gemini (not Claude) with corrected env var name
- [ ] New API endpoints documented in Swagger (Swagger decorators on new controllers)
- [ ] `DEPLOYMENT.md` updated with support-admin Vercel cron setup

---

## Sign-off

| Phase | Completed By | Verified By | Date |
|-------|-------------|------------|------|
| Phase 1 — Security Hardening | | | |
| Phase 2 — Core Portal Extension | | | |
| Phase 3 — Observability Layer | | | |
| Phase 4 — Polish & Quality | | | |
| **LAUNCH APPROVED** | | | |

---

## Post-MVP Monitoring (First 30 Days)

- [ ] Neon storage checked (should be < 250 MB)
- [ ] Auth0 MAU checked (should be < 100 for internal users)
- [ ] Render RAM usage checked during peak support activity (should be < 400 MB)
- [ ] Keep-alive cron confirmed working (check Vercel function logs)
- [ ] No new P0/P1 security findings from ongoing code review
- [ ] Feedback collected from support team after 2 weeks of use
