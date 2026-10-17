# 04 — Technical Architecture

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Architecture Decision: Extend support-admin

The admin portal IS the extended `work-nucleus/support-admin/` application. No new service, no new deployment.

### Rationale
- Existing Auth0 connection isolation already enforces staff-only access
- All cross-org backend APIs already exist and are role-gated
- Existing sidebar, top-bar, layout components ready to extend
- Same deployment pipeline (Vercel free tier)
- Zero new infrastructure cost

---

## 2. Application Structure (After Extension)

```
support-admin/src/
├── app/
│   ├── layout.tsx                   ← root: Auth0Provider (support connection)
│   ├── globals.css                  ← extend to match design-system-v2 tokens
│   ├── login/                       ← existing
│   ├── (protected)/
│   │   ├── layout.tsx               ← sidebar + top-bar + session check
│   │   ├── page.tsx                 ← dashboard (extend with new KPIs)
│   │   ├── organizations/           ← existing (add Settings tab)
│   │   ├── tickets/                 ← existing
│   │   ├── metrics/                 ← existing
│   │   ├── tools/                   ← existing (add impersonation UI)
│   │   ├── users/                   ← NEW
│   │   │   ├── page.tsx             ← cross-org user directory
│   │   │   └── [userId]/page.tsx    ← user detail + deactivate
│   │   ├── marketplace/             ← NEW
│   │   │   ├── mandates/page.tsx
│   │   │   ├── mandates/[id]/page.tsx
│   │   │   ├── recruiters/page.tsx
│   │   │   ├── recruiters/[id]/page.tsx
│   │   │   └── rewards/page.tsx
│   │   ├── ai-operations/           ← NEW
│   │   │   ├── page.tsx             ← AI cost dashboard
│   │   │   └── logs/page.tsx        ← AI call log table
│   │   ├── security/                ← NEW
│   │   │   ├── audit-log/page.tsx   ← platform-wide audit log
│   │   │   ├── security-log/page.tsx← SecurityLog chain viewer
│   │   │   └── sessions/page.tsx    ← moved from tools
│   │   └── system-health/           ← NEW
│   │       └── page.tsx             ← service status cards
│   └── api/
│       ├── auth/                    ← existing Auth0 SDK
│       └── support/                 ← existing proxies
│           ├── [new endpoints proxied here]
├── components/
│   ├── support-sidebar.tsx          ← extend with new nav sections
│   ├── support-top-bar.tsx          ← existing
│   └── ui/                         ← add table, badge, confirm-dialog, etc.
├── hooks/
│   └── use-profile.tsx              ← existing
└── lib/
    └── api.ts                       ← existing API client helper
```

---

## 3. Backend Architecture (New Endpoints)

### New module: admin-platform (or extend support module)

Recommendation: Add new controllers to the existing `support` module rather than creating a new module. The `support` module already houses all cross-org operations.

**New controllers to add:**

#### 3.1 Platform Users Controller
```typescript
// GET /api/v1/support/users — cross-org user directory
// GET /api/v1/support/users/:userId — user detail
// PATCH /api/v1/support/users/:userId/deactivate — deactivate (SUPPORT_ADMIN)
// PATCH /api/v1/support/users/:userId/activate — reactivate (SUPPORT_ADMIN)
```
Guard: `@Roles(SUPPORT_REP, SUPPORT_ADMIN)` on GET, `@Roles(SUPPORT_ADMIN)` on PATCH

#### 3.2 Platform Marketplace Controller
```typescript
// GET /api/v1/support/mandates — all mandates (paginated, filters)
// GET /api/v1/support/mandates/:mandateId — mandate detail
// GET /api/v1/support/recruiters — all recruiters (paginated, filters)
// GET /api/v1/support/recruiters/:recruiterId — recruiter detail
// PATCH /api/v1/support/recruiters/:recruiterId/verify — verify (SUPPORT_ADMIN)
// PATCH /api/v1/support/recruiters/:recruiterId/deactivate — deactivate (SUPPORT_ADMIN)
// GET /api/v1/support/rewards — all reward tracking (paginated, filters)
// GET /api/v1/support/claim-scopes — ownership disputes (filter by status)
```

#### 3.3 Platform AI Cost Controller (extend existing AiCostController)
```typescript
// GET /api/v2/support/ai-cost — platform-wide dashboard (SUPPORT_ADMIN)
// GET /api/v2/support/ai-cost/logs — AiCallLog list (paginated, SUPPORT_ADMIN)
```
Note: Do not confuse with existing `GET /api/v2/ai-cost/dashboard` which is org-scoped.

#### 3.4 Platform Audit Controller (extend existing AuditController)
```typescript
// GET /api/v1/support/audit-log — cross-org audit log (SUPPORT_ADMIN)
// GET /api/v1/support/security-log — cross-org SecurityLog (SUPPORT_ADMIN)
// GET /api/v2/support/security/verify-chain — cross-org chain verify (SUPPORT_ADMIN)
```

---

## 4. Data Flow

### Standard Read Flow (support-admin → backend)

```
Browser (support-admin)
    → GET /api/support/mandates?page=1&status=ACTIVE
    → support-admin Next.js API route
    → auth0.getAccessToken() (support connection token)
    → fetch(API_URL_INTERNAL + '/api/v1/support/mandates', { Authorization: Bearer <token> })
    → NestJS: JwtAuthGuard (validates RS256 JWT from support connection)
               RolesGuard (checks SUPPORT_REP or SUPPORT_ADMIN)
               Controller → Service → PrismaService.mandate.findMany(...)
    → JSON response
    → Next.js passes to browser
```

### Mutating Action Flow (e.g., recruiter verification)

```
Browser: User clicks "Verify" → confirmation modal
    → User confirms → PATCH /api/support/recruiters/:id/verify
    → Next.js API route → fetch backend with bearer
    → NestJS: guards check SUPPORT_ADMIN role
               Service: prisma.recruiterProfile.update({ isVerified: true })
               Service: auditService.log({ action: 'RECRUITER_VERIFIED', ... })
               Service: securityService.append({ eventType: 'CONFIG_CHANGED', ... })
    → 200 OK
    → UI toast "Recruiter verified successfully"
```

---

## 5. API Conventions

Follow existing backend conventions:
- Path prefix: `/api/v1/support/*` for support/admin endpoints
- Response envelope for lists: `{ data: [], meta: { total, page, limit, totalPages } }`
- Error envelope: `{ error: { code, message, details? }, statusCode }`
- All new DTOs use class-validator classes (`whitelist: true, forbidNonWhitelisted: true`)
- All new service methods take `actorId` (the support user's ID) for audit logging

---

## 6. Shared Components Strategy

### Reuse from existing support-admin

- `SupportSidebar` — extend with new nav items
- `SupportTopBar` — no changes needed
- `Card`, `Badge`, `Button`, `Input`, `Select` — from `src/components/ui/`

### Reuse from main frontend (copy, not import)

Since there is no shared library, copy these patterns:
- `DataTable` pattern (paginated sortable table)
- `PageHeader` pattern
- `KpiCard` pattern
- `EmptyState` pattern
- `ConfirmDialog` pattern (new — needed for sensitive actions)

### New components for admin portal

| Component | Purpose |
|-----------|---------|
| `ConfirmDialog` | Reusable destructive action confirmation with reason field |
| `AuditLogTable` | Paginated table for AuditLog entries |
| `StatusBadge` | Consistent badge mapping for all status enums |
| `AdminActionMenu` | Dropdown with permission-aware action items |
| `PlatformKpiCard` | Variant of KpiCard with trend indicator |
| `TimelineView` | For reward status history and session history |

---

## 7. Deployment Boundaries

No changes to deployment boundaries:
- `support-admin` deployed to Vercel (separate project from `frontend`)
- Backend deployed to Render (same service, new endpoints added)
- No new services, no new infrastructure

### Vercel configuration for support-admin

```json
// support-admin/vercel.json
{
  "rewrites": [
    { "source": "/api/auth/:path*", "destination": "/api/auth/:path*" },
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ]
}
```

---

## 8. Environment Variables (No New Variables Needed)

All required environment variables already exist. New endpoints use the same:
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` (support), `AUTH0_CLIENT_SECRET` (support)
- `AUTH0_AUDIENCE`
- `API_URL_INTERNAL` (backend URL for server-side fetches)
- `NEXT_PUBLIC_API_URL`

No new secrets required for MVP.

---

## 9. Architecture Decisions Record

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| App location | Extend support-admin | New separate app | Zero new deployment, reuse existing isolation |
| Backend org | Add to `support` module | New `admin-platform` module | Support module already has all cross-org patterns |
| Role mapping | SUPPORT_ADMIN = platform ops | New PLATFORM_ADMIN role check | Existing role enforcement; PLATFORM_ADMIN UserType not yet implemented |
| Component strategy | Copy patterns from frontend | Shared library | No shared library exists; copying is pragmatic |
| State management | React useState + fetch (as current) | React Query, Zustand | Consistent with existing support-admin code |
| Auth | Existing Auth0 support connection | New Auth0 connection | Connection isolation already adequate |
