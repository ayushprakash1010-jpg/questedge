# QuestEdge Support Admin Portal

> Internal-only admin portal for `SUPPORT_REP` and `SUPPORT_ADMIN` roles.  
> Built with Next.js 14 (App Router) + Auth0.

---

## Routes & Role Requirements

| Route | Page | Min Role |
|-------|------|----------|
| `/` | Overview Dashboard | SUPPORT_REP |
| `/organizations` | Organization Directory | SUPPORT_REP |
| `/organizations/[orgId]` | Organization Detail | SUPPORT_REP |
| `/users` | Cross-Org User Directory | SUPPORT_REP |
| `/users/[userId]` | User Detail | SUPPORT_REP |
| `/users/[userId]` → Actions tab | Deactivate / Reactivate | **SUPPORT_ADMIN** |
| `/tickets` | Support Tickets | SUPPORT_REP |
| `/tickets/[ticketId]` | Ticket Detail | SUPPORT_REP |
| `/marketplace` | Marketplace Hub | SUPPORT_REP |
| `/marketplace/mandates` | Mandate Directory | SUPPORT_REP |
| `/marketplace/mandates/[mandateId]` | Mandate Detail | SUPPORT_REP |
| `/marketplace/recruiters` | Recruiter Directory | SUPPORT_REP |
| `/marketplace/recruiters/[recruiterId]` | Recruiter Detail | SUPPORT_REP |
| `/marketplace/recruiters/[recruiterId]` → Actions | Verify / Deactivate | **SUPPORT_ADMIN** |
| `/marketplace/rewards` | Reward Tracking | SUPPORT_REP |
| `/metrics` | Platform Metrics | SUPPORT_REP |
| `/ai-operations` | AI Cost Dashboard | **SUPPORT_ADMIN** |
| `/ai-operations/logs` | AI Call Logs | **SUPPORT_ADMIN** |
| `/security` | Audit & Security Logs | **SUPPORT_ADMIN** |
| `/system-health` | System Health | **SUPPORT_ADMIN** |
| `/tools` | Support Tools | SUPPORT_REP |

> `SUPPORT_ADMIN`-only nav items are hidden from `SUPPORT_REP` in the sidebar. If accessed directly, the backend returns `403 Forbidden`.

---

## Environment Variables

Required in Vercel project settings:

| Variable | Description |
|----------|-------------|
| `AUTH0_SECRET` | Auth0 secret (32+ chars) |
| `AUTH0_BASE_URL` | Production URL of this app |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL |
| `AUTH0_CLIENT_ID` | Auth0 app client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 app client secret |
| `AUTH0_AUDIENCE` | API audience (e.g. `https://api.questedge.com/`) |
| `NEXT_PUBLIC_API_URL` | Backend NestJS URL |
| `NEXT_PUBLIC_USE_MOCK_DATA` | Set to `"true"` for local mock dev |
| `NEXT_PUBLIC_MAIN_APP_URL` | Main app URL for back-link |

---

## Vercel Cron — Keep-Alive

Configured in [`vercel.json`](./vercel.json):

```json
{
  "crons": [{ "path": "/api/keep-alive", "schedule": "*/10 * * * *" }]
}
```

- Runs every **10 minutes** — prevents Render free-tier cold starts (spin-down at 15 min).
- Available at `/api/keep-alive` — returns backend health status + latency.
- **Cost: $0** — Vercel Hobby cron is free.

---

## Local Development

```bash
# Install dependencies
npm install

# Mock mode (no Auth0 required)
NEXT_PUBLIC_USE_MOCK_DATA=true npm run dev

# Real Auth0 mode
cp .env.local.example .env.local  # fill in Auth0 credentials
npm run dev
```

---

## Shared Components

| Component | Path | Use |
|-----------|------|-----|
| `ConfirmDialog` | `components/confirm-dialog.tsx` | All destructive action modals |
| `StatusBadge` | `components/status-badge.tsx` | All enum status displays |
| `Skeleton / TableSkeleton` | `components/skeletons.tsx` | Loading states |
| `EmptyState / ErrorState` | `components/feedback.tsx` | Empty + error states |
| `SupportSidebar` | `components/support-sidebar.tsx` | Layout sidebar |
| `SupportTopBar` | `components/support-top-bar.tsx` | Layout top bar |

---

## API Proxy Routes

All frontend API calls go through Next.js proxy routes (`/api/support/...`) which:
1. Verify Auth0 session
2. Forward with `Authorization: Bearer <token>` to the backend
3. Return the backend response verbatim

| Proxy | Backend Endpoint |
|-------|-----------------|
| `GET /api/support/users` | `GET /api/v1/support/users` |
| `GET /api/support/users/[userId]` | `GET /api/v1/support/users/:id` |
| `PATCH /api/support/users/[userId]/deactivate` | `PATCH /api/v1/support/users/:id/deactivate` |
| `PATCH /api/support/users/[userId]/activate` | `PATCH /api/v1/support/users/:id/activate` |
| `GET /api/support/mandates` | `GET /api/v1/support/mandates` |
| `GET /api/support/mandates/[mandateId]` | `GET /api/v1/support/mandates/:id` |
| `GET /api/support/recruiters` | `GET /api/v1/support/recruiters` |
| `GET /api/support/recruiters/[recruiterId]` | `GET /api/v1/support/recruiters/:id` |
| `PATCH /api/support/recruiters/[id]/verify` | `PATCH /api/v1/support/recruiters/:id/verify` |
| `GET /api/support/rewards` | `GET /api/v1/support/rewards` |
| `GET /api/support/ai-cost` | `GET /api/v1/support/ai-cost` |
| `GET /api/support/ai-cost/logs` | `GET /api/v1/support/ai-cost/logs` |
| `GET /api/support/audit-log` | `GET /api/v1/support/audit-log` |
| `GET /api/support/security-log` | `GET /api/v1/support/security-log` |
| `GET /api/support/health` | `GET /api/v1/health` |

---

## Deployment

1. Push to `main` → Vercel auto-deploys
2. Set all environment variables in Vercel dashboard
3. Verify cron is listed in Vercel → Project → Settings → Cron Jobs
4. After backend deploy: `npx prisma migrate deploy` to apply indexes
