# 08 — Zero-Cost Infrastructure Plan

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Constraint Definition

**Hard constraints:**
- ₹0 additional monthly cost over current infrastructure spend
- No new paid SaaS tools, managed services, or database tiers
- No mandatory paid API subscriptions
- No database migrations or schema changes that require paid plan features

**Soft constraints:**
- Must stay within free-tier limits of all current providers
- Prefer reuse of existing code patterns over new dependencies
- Total npm package additions should be minimal (0-2 packages)

---

## 2. Current Infrastructure Cost (Baseline)

| Service | Provider | Current Plan | Monthly Cost | Admin Portal Impact |
|---------|----------|-------------|-------------|---------------------|
| Frontend (main) | Vercel | Hobby free | ₹0 | None |
| Frontend (support-admin) | Vercel | Hobby free | ₹0 | Adds ~5 new pages (trivial bandwidth) |
| Backend | Render | Free tier | ₹0 | Adds ~8 new endpoints (no extra cost) |
| Database | Neon | Free (0.5 GB) | ₹0 | Adds read queries only (no new tables) |
| Cache | Upstash | Free (10K cmds/day) | ₹0 | No cache used in admin portal queries |
| Auth | Auth0 | Free (7,500 MAU) | ₹0 | No new Auth0 app/connection |
| Object Storage | MinIO (dev) | Self-hosted | ₹0 | No file uploads in admin portal |
| AI | Gemini API | Free tier | ₹0 | No new AI calls from admin portal |
| Job queue | pg-boss | In-process | ₹0 | No new jobs |

**Total incremental cost: ₹0/month**

---

## 3. Free Tier Limits and Usage Analysis

### 3.1 Neon (PostgreSQL)

| Limit | Neon Free Tier | Our Usage | Risk |
|-------|---------------|-----------|------|
| Storage | 0.5 GB | Estimated ~100-200 MB current | LOW |
| Compute | 0.25 vCPU, 1 GB RAM | Shared with all queries | LOW |
| Active connections | 100 pooled | pgBouncer via Neon | LOW |
| Branching | 1 branch | Dev only | NONE |

**Admin portal impact:** Adds read-only queries to existing tables. No new tables. No new indexes needed (existing indexes cover all planned queries — verified against schema). Estimated additional query load: +5-20 queries per admin session.

**NEW QUERIES using existing indexes:**
```
AiCallLog:    @@index([orgId, createdAt]) ✅
AuditLog:     @@index([orgId, userId]) ✅ (need to verify userId index exists)
SecurityLog:  @@index([orgId, createdAt]) ✅
RewardTracking: @@index([recruiterId, status]) ✅ @@index([orgId]) ✅
Mandate:      @@index([orgId, status]) ✅ @@index([status]) ✅
RecruiterProfile: No index on isVerified — paginated queries will use sequential scan
```

**ACTION REQUIRED (no cost):** Add `@@index([isVerified, isActive])` on `RecruiterProfile` before deploying recruiter list endpoint. This is a schema migration — zero cost on Neon free tier.

### 3.2 Render (Backend)

| Limit | Render Free Tier | Our Usage | Risk |
|-------|-----------------|-----------|------|
| RAM | 512 MB | NestJS with 46 modules ~200-300 MB | MEDIUM |
| CPU | Shared | Normal load | LOW |
| Cold start | 15 min sleep | Admin sessions are infrequent | MEDIUM |
| Bandwidth | 100 GB/mo | Minimal API responses | LOW |
| Concurrent requests | Unlimited | Normal | LOW |

**Admin portal impact:** New endpoints add ~500 lines of controller/service code. RAM impact negligible. 

**Cold start risk:** Admin users triggering backend cold starts would see 15-30 second delays. Mitigate with a keep-alive ping from the support-admin Vercel deployment (a cron API route that pings `/health` every 14 minutes — this is within Vercel's free tier and costs ₹0).

```typescript
// support-admin/src/app/api/cron/keep-alive/route.ts
// Vercel cron: "*/14 * * * *" in vercel.json
export async function GET() {
  await fetch(process.env.API_URL_INTERNAL + '/health');
  return Response.json({ ok: true });
}
```

### 3.3 Vercel (support-admin frontend)

| Limit | Vercel Hobby | Our Usage | Risk |
|-------|-------------|-----------|------|
| Bandwidth | 100 GB/mo | < 1 GB for admin use | NONE |
| Serverless function executions | 100K/mo | < 1K for admin | NONE |
| Build time | 45 min/mo | < 5 min per deploy | NONE |
| Deployments | Unlimited | Standard CI | NONE |
| Cron jobs | 2/project | 1 (keep-alive) | NONE |

**Admin portal impact:** Negligible. Adding new pages to Next.js app has zero runtime cost on Vercel.

### 3.4 Auth0

| Limit | Auth0 Free | Our Usage | Risk |
|-------|-----------|-----------|------|
| MAU | 7,500 | Support staff ~5-10 users | NONE |
| M2M tokens | 1,000/mo | Backend management API calls | LOW |
| Social connections | 3 | Not used for support app | NONE |

**Admin portal impact:** Zero. Uses same Auth0 support connection already configured.

### 3.5 Upstash (Redis)

| Limit | Upstash Free | Our Usage | Risk |
|-------|-------------|-----------|------|
| Commands/day | 10,000 | Currently in-memory cache (0 commands) | NONE |

**Admin portal impact:** Zero. Admin portal uses no caching (data freshness is critical for an ops tool).

---

## 4. New npm Dependencies Analysis

### Required packages

| Package | Purpose | Size | Cost |
|---------|---------|------|------|
| None new required | All functionality uses existing packages | — | ₹0 |

**Justification:**
- Tables: Native HTML table with CSS (already done in support-admin)
- Charts (AI cost chart): `recharts` is already in the main frontend — copy the pattern; or use a simple ASCII/table-based view initially (no chart library needed)
- Date filtering: Native `Date` objects (no `date-fns` needed for MVP)
- Confirm dialogs: Native React + existing UI primitives
- Data fetching: `fetch` (already used)

**Optional (already in package.json of main frontend):**
- `recharts` — if charts are needed in Phase 3 AI Operations page, copy from main frontend's `package.json`. Only add if absolutely needed for readability.

---

## 5. Zero-Cost Schema Changes

Two schema additions are planned (Phase 1 security):

### 5.1 RecruiterProfile index (Phase 2)

```prisma
// In RecruiterProfile model, add:
@@index([isVerified, isActive])
@@index([createdAt])
```

This is a `CREATE INDEX` operation in Postgres. On Neon free tier:
- No cost
- Takes < 1 second for small tables
- Run via `prisma db push` or new migration

### 5.2 No other schema changes required

All new admin endpoints read from existing tables using existing indexes. No new tables, no new columns.

---

## 6. Operational Cost of Sensitive Actions

| Action | Auth0 API Call? | Cost |
|--------|----------------|------|
| User deactivation | YES — `blockUser` on Auth0 Management API | Counts toward M2M token limit (1,000/mo) |
| User reactivation | YES — `unblockUser` | Same |
| Recruiter verify | NO — only Postgres write | ₹0 |
| Feature flag update | NO — only Postgres write | ₹0 |
| GDPR export | NO — only Postgres read | ₹0 |
| Shadow session | NO — only Postgres write | ₹0 |

**Auth0 M2M concern:** Backend already uses Auth0 Management API for user sync (`/auth/sync` endpoint). Adding user deactivation adds ~2 calls per deactivation. At expected admin volume (< 10 deactivations/month), this is well within the 1,000/month free tier.

If the Auth0 Management API M2M token is already being cached (common pattern), each block/unblock call reuses the cached token and doesn't count as a new M2M authentication.

---

## 7. Monitoring (Zero-Cost)

| What to monitor | How | Cost |
|----------------|-----|------|
| Backend health | `GET /health` from keep-alive cron | ₹0 |
| AI service health | `GET /ai/health` from system-health page | ₹0 |
| Neon storage usage | Neon dashboard (manual check weekly) | ₹0 |
| Auth0 MAU | Auth0 dashboard (manual check monthly) | ₹0 |
| Render RAM usage | Render dashboard (manual check on incidents) | ₹0 |
| Error rates | Filter failed AI calls + notification delivery failures | ₹0 (existing data) |

No paid monitoring tools (Datadog, New Relic, Sentry) are required for MVP. Add Sentry free tier as an optional low-cost addition post-MVP.

---

## 8. Upgrade Triggers

Document when to consider paid upgrades (not now — only if these thresholds are hit):

| Trigger | Threshold | Upgrade |
|---------|-----------|---------|
| Neon storage | > 400 MB (80% of free) | Neon Launch $19/mo |
| Auth0 MAU | > 6,000 (80% of free) | Auth0 Essential $23/mo |
| Render RAM OOM | Repeated crashes | Render Starter $7/mo |
| Support team > 5 people | High concurrent admin usage | No cost change with current architecture |
| Admin portal needs caching | > 100 admin page loads/day | Enable Upstash (already configured) |
