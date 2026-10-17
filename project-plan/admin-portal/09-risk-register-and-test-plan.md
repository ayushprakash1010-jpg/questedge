# 09 — Risk Register and Test Plan

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Risk Register

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner |
|----|------|-------------|--------|----------|-----------|-------|
| R-01 | Admin endpoint returns cross-org data to non-SUPPORT_ADMIN user | Low | Critical | P0 | Backend @Roles gate on every new endpoint; integration test each endpoint with SUPPORT_REP token | Dev |
| R-02 | SecurityLog hash fix breaks chain verification for existing records | Low | High | P1 | Run verifyChain BEFORE deploying fix; compare results; deploy only if no breakage | Dev |
| R-03 | Neon storage limit hit (0.5 GB) | Low | High | P1 | Add index on RecruiterProfile (smaller than table data); monitor weekly | Ops |
| R-04 | Render cold start causes poor admin UX (15-30 sec delay) | High | Medium | P2 | Implement keep-alive cron in support-admin Vercel | Dev |
| R-05 | Auth0 Management API M2M token limit hit (1,000/mo) | Low | Medium | P2 | Cache M2M token; count current usage before adding deactivation calls | Dev |
| R-06 | Auth0 claim namespace mismatch causes all JWT validation failures | Medium | Critical | P0 | Verify Login Action namespace matches strategy before any deployment | Dev |
| R-07 | Debug endpoints (test-ai, test-whatsapp) trigger in production | High (already deployed) | High | P0 | Remove in Phase 1 immediately | Dev |
| R-08 | User deactivation does not propagate to Auth0 (incomplete block) | Medium | High | P1 | Verify Auth0 Management API `blockUser` is called AND local `isActive = false` set atomically | Dev |
| R-09 | Cross-org audit log exposes PII from orgs in search results | Low | High | P1 | Ensure audit log endpoint returns userId, action, entity type — NOT free-text changes that contain names/emails | Dev |
| R-10 | Admin portal accessible to internet via direct Vercel URL | Low | High | P1 | Auth0 session check (already in layout.tsx); backend role gate is final authority | Dev |
| R-11 | pg-boss jobs miss scheduled runs due to Render sleep | High | Medium | P2 | Keep-alive ping (also fixes R-04) + document that cron jobs may have ≤15 min delay on free tier | Ops |
| R-12 | RewardTracking financial data exposed without sufficient authorization | Low | Critical | P0 | SUPPORT_REP can VIEW reward status but NOT amounts without SUPPORT_ADMIN? (decision needed — see below) | Product |
| R-13 | New Prisma queries without indexes cause slow queries / timeouts | Medium | Medium | P2 | Code review checklist: all new findMany must use indexed columns in WHERE clause | Dev |
| R-14 | support-admin environment variables missing in Vercel project | Medium | High | P1 | Audit Vercel env vars for support-admin before deploying new pages | Ops |

### Decision Required: R-12 — Reward Amount Visibility

| Option | SUPPORT_REP sees | SUPPORT_ADMIN sees |
|--------|-----------------|-------------------|
| Option A (conservative) | Status only (POTENTIAL/ELIGIBLE/PAID) | Full amounts |
| Option B (current plan) | Full amounts including INR values | Full amounts |

**Recommendation:** Option A for MVP. Financial amounts (rewardAmount in INR) should require SUPPORT_ADMIN. Implement by having the API return `amount: null` for SUPPORT_REP and `amount: 15000.00` for SUPPORT_ADMIN.

---

## 2. Test Plan

### 2.1 Unit Tests

| Target | Test |
|--------|------|
| `PlatformUsersService.listUsers` | Returns paginated users; search filters work |
| `PlatformUsersService.deactivateUser` | Sets isActive=false, writes AuditLog |
| `PlatformUsersService.deactivateUser` | Throws if calling user is not SUPPORT_ADMIN |
| `PlatformMarketplaceService.verifyRecruiter` | Sets isVerified=true, sets verifiedAt, writes AuditLog |
| `PlatformMarketplaceService.verifyRecruiter` | Throws if recruiter not found |
| `PlatformAiCostService.dashboard` | Aggregates by agent; excludes null orgId records correctly |
| `PlatformAuditService.listCrossOrg` | Returns entries from multiple orgs; orgId filter works |
| `SecurityService.verifyChain` (after fix) | Returns `ok:false` when hash mismatch detected |
| `SecurityService.verifyChain` (after fix) | Returns `ok:true` for intact chain |
| `ConfirmDialog` component | Renders reason field when `requireReason=true`; disables confirm when reason empty |
| `StatusBadge` component | Maps each status enum value to correct badge color |

### 2.2 Integration Tests (Backend)

For each new endpoint, test all of the following:

**Authentication checks:**
- `401 Unauthorized` when no Bearer token
- `403 Forbidden` when valid JWT but wrong role (e.g., SUPPORT_REP on SUPPORT_ADMIN endpoint)
- `200 OK` when correct role

**Specific endpoint tests:**

| Endpoint | Test Scenarios |
|----------|---------------|
| `GET /api/v1/support/users` | Empty results with no matching search; pagination correct; role filter works |
| `PATCH /api/v1/support/users/:id/deactivate` | 200 with valid userId + reason; 404 if userId not found; 400 if reason empty |
| `PATCH /api/v1/support/recruiters/:id/verify` | Idempotent (verify already-verified → 200 with no-op); AuditLog entry created |
| `GET /api/v1/support/ai-cost` | Returns 0 values when no AiCallLog entries; aggregation correct |
| `GET /api/v1/support/audit-log` | Cross-org (multiple orgIds in results); orgId filter narrows results |
| `GET /api/v2/support/security/verify-chain?orgId=X` | Works for SUPPORT_ADMIN; 403 for SUPPORT_REP |

**Data isolation:**
- Confirm that calling `GET /api/v1/support/users?orgId=WRONG_UUID` returns empty, not 403
- Confirm that `GET /api/v1/support/audit-log` without orgId filter returns entries from multiple orgs

### 2.3 E2E Tests (Frontend)

| Scenario | Steps | Expected |
|----------|-------|---------|
| Support rep cannot access AI Operations | Login as SUPPORT_REP → navigate to /ai-operations | Redirect or "Access Restricted" state |
| Recruiter verification flow | Login as SUPPORT_ADMIN → /marketplace/recruiters → filter unverified → click Verify → confirm | Badge changes to Verified; toast appears |
| User deactivation with reason | Login as SUPPORT_ADMIN → /users → find user → /users/[id] → Deactivate → enter reason → confirm | User shows Inactive; cannot be deactivated again without reactivation |
| User deactivation blocked without reason | Click Deactivate → leave reason empty → click Confirm | Button stays disabled; no API call made |
| Dashboard loads without errors | Login as SUPPORT_REP → visit / | All KPI cards render with numeric values; no error states |
| Audit log cross-org | Login as SUPPORT_ADMIN → /security/audit-log | Table shows entries from multiple orgs |
| Audit log org filter | Filter by specific orgId | Only entries for that org visible |
| Security chain verify | Click "Verify Chain Integrity" | Shows chain status result within 5 seconds |

### 2.4 Security Tests

| Test | Method |
|------|--------|
| Role boundary: SUPPORT_REP cannot call SUPPORT_ADMIN endpoints | Automated (integration tests above) |
| Customer JWT cannot call support endpoints | Use main app JWT (customer connection) to call `/api/v1/support/dashboard` → expect 403 |
| Debug endpoints removed | `GET /api/v1/mandates/test-ai` → expect 404 |
| No auth0Sub in API responses | Assert `auth0Sub` field absent in all list/detail responses |
| CORS: cross-origin request blocked | Attempt request from non-allowlisted origin → expect CORS error |
| Rate limit on AI cost internal endpoint | Send 60+ requests/minute → expect 429 |
| SQL injection via search param | `search='; DROP TABLE users; --` → expect no error and no data loss |
| Audit log written on deactivation | Deactivate user → query AuditLog → assert entry exists with correct fields |

### 2.5 Performance Tests

| Scenario | Acceptance Threshold |
|----------|---------------------|
| Dashboard page load (Render cold start) | < 30 seconds (with keep-alive, < 3 seconds) |
| Dashboard page load (warm) | < 2 seconds |
| User list (1000+ users, page 1) | < 1 second on Neon |
| Audit log (100K+ entries, org filter) | < 2 seconds (using orgId index) |
| AI cost aggregation (30 days, 10K log entries) | < 3 seconds |
| SecurityLog chain verify (1000 records) | < 5 seconds |

### 2.6 Accessibility Tests

| Test | Tool | Standard |
|------|------|---------|
| Keyboard navigation of sidebar | Manual | Tab/Enter/Space navigable |
| Screen reader compatibility | VoiceOver (macOS) | ARIA labels present |
| Color contrast | axe DevTools | WCAG 2.1 AA (4.5:1 text, 3:1 large text) |
| Focus management in ConfirmDialog | Manual | Focus trapped; restored on close |
| Status badges readable without color | Manual | Text label present in all badges |

---

## 3. Definition of Done

A feature is "done" when:

- [ ] Backend endpoint implemented with correct `@Roles` gate
- [ ] Frontend page renders without console errors
- [ ] Loading, empty, and error states implemented
- [ ] Role-based rendering: action buttons hidden for insufficient role
- [ ] Confirm dialog implemented for all destructive actions
- [ ] AuditLog entry written for all mutating actions (verified by test)
- [ ] Unit test written and passing
- [ ] Integration test passing for auth boundary (401, 403, 200)
- [ ] No `auth0Sub` or sensitive tokens in API response
- [ ] PR reviewed and approved
- [ ] Deployed to staging and smoke-tested

---

## 4. Test Environment

| Environment | URL | Notes |
|-------------|-----|-------|
| Local dev | `localhost:3002` (support-admin) + `localhost:3000` (backend) | Use `NEXT_PUBLIC_USE_MOCK_DATA=false` |
| Staging | Vercel preview URL (auto-generated per PR) | Connects to Render backend |
| Production | `support.questedge.com` or similar | Separate Vercel domain |

**Testing accounts to provision:**
- `support-rep-test@internal.questedge.com` — SUPPORT_REP role
- `support-admin-test@internal.questedge.com` — SUPPORT_ADMIN role
- `customer-test@acme.com` — COMPANY_ADMIN role (to verify cross-connection isolation)
