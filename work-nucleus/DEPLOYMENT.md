# QuestEdge Deployment Runbook

Production architecture: **Vercel** (Next.js frontend) + **Render** (NestJS backend + pg-boss background workers) + **Neon** (PostgreSQL) + **S3 / Cloudflare R2** (resumes, joining documents, offer letters, compensation letters) + **Resend** (transactional emails and BGV consent OTPs).

---

## Step 1: Database (Neon PostgreSQL)

1. Create a PostgreSQL project on [neon.tech](https://neon.tech/) (`questedge-db`) and copy the pooled / direct `DATABASE_URL` (`postgresql://...sslmode=require`).
2. Background job queues (`pg-boss`) and transactional persistence both run on Neon PostgreSQL, so no separate Redis service is required.

---

## Step 2: Baseline vs. Fresh Schema Migration

Migration history is stored in `backend/prisma/migrations/0001_baseline`.

- **Fresh Neon database:**
  ```bash
  cd backend
  npx prisma migrate deploy
  ```
- **Existing Neon database (previously synced with `prisma db push`):**
  Mark the baseline applied once without dropping or modifying existing data, then run `migrate deploy`:
  ```bash
  cd backend
  npx prisma migrate resolve --applied 0001_baseline
  npx prisma migrate deploy
  ```

---

## Step 3: Backend API (Render)

1. Create a **Web Service** on [render.com](https://render.com/) connected to your repository.
2. Configure build settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install --legacy-peer-deps --include=dev && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:prod` *(runs baseline check, `npx prisma migrate deploy`, and `node dist/main`)*
3. Set required **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL` *(Neon connection string)*
   - `AUTH0_DOMAIN` *(Auth0 tenant or custom domain)*
   - `AUTH0_AUDIENCE` *(Auth0 API identifier)*
   - `AUTH0_MANAGEMENT_DOMAIN`, `AUTH0_MANAGEMENT_CLIENT_ID`, `AUTH0_MANAGEMENT_CLIENT_SECRET`
   - `AUTH0_SYNC_SECRET` *(strong random secret for post-login sync webhook)*
   - `SUPPORT_ADMIN_SUBS` / `SUPPORT_ADMIN_EMAILS` *(comma-separated allowlist for platform admins)*
   - `FRONTEND_URL` *(exact production Vercel URL, e.g. `https://app.questedge.in`)*
   - `EXTRA_CORS_ORIGINS` *(optional comma-separated additional origins)*
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` *(e.g. `QuestEdge <noreply@yourdomain.com>`)*
   - `GEMINI_API_KEY` *(AI JD generation, match scoring, feedback & BGV summaries)*
   - `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_OFFERS_BUCKET`
   - Vendor webhook secrets (unique strong secrets; required if corresponding vendor API key is configured):
     - `DIGIO_WEBHOOK_SECRET` *(when `DIGIO_CLIENT_ID` / `DIGIO_CLIENT_SECRET` are set)*
     - `AUTHBRIDGE_WEBHOOK_SECRET` *(when `AUTHBRIDGE_API_KEY` is set)*
     - `MSG91_WEBHOOK_SECRET` *(when `MSG91_AUTH_KEY` is set)*
   - Keep `ENABLE_SWAGGER=false` in production.

---

## Step 4: Frontend (Vercel)

1. Create a Vercel project with **Root Directory** set to `frontend`.
2. Add **Environment Variables**:
   - `AUTH0_SECRET` *(32+ byte random hex string, e.g. `openssl rand -hex 32`)*
   - `AUTH0_DOMAIN` *(same Auth0 domain)*
   - `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` *(Auth0 Regular Web / SPA app credentials)*
   - `AUTH0_AUDIENCE` *(same Auth0 API identifier)*
   - `APP_BASE_URL` *(production frontend URL, e.g. `https://app.questedge.in`)*
   - `NEXT_PUBLIC_API_URL` *(Render backend URL, e.g. `https://questedge-api.onrender.com`)*
   - `NEXT_PUBLIC_POSTHOG_KEY` *(optional PostHog project key)* and `NEXT_PUBLIC_POSTHOG_HOST=/ingest`

---

## Step 5: Auth0 Callback & Origin URLs (v4 SDK)

This frontend uses `@auth0/nextjs-auth0` v4 with custom `/auth/*` routes configured in `frontend/src/lib/auth0.ts`.

In the Auth0 Dashboard for your application:
- **Allowed Callback URLs**: `https://<your-vercel-domain>/auth/callback`
- **Allowed Logout URLs**: `https://<your-vercel-domain>`
- **Allowed Web Origins**: `https://<your-vercel-domain>`

---

## Post-Launch Optional Integrations

The items below are intentionally gated / safe to enable after launch without code changes:
- **Coding IDE Assessments:** Configure `JUDGE0_API_URL`, `JUDGE0_API_KEY`, and `JUDGE0_API_HOST` on Render. The UI automatically unlocks `CODING` challenge creation and execution once `GET /api/v2/assessment-take/coding-status` reports `enabled: true`.
- **BGV Consent SMS / WhatsApp OTP (MSG91):** BGV DPDP consent OTPs send via Email (`RESEND_API_KEY`) by default. Add `MSG91_AUTH_KEY`, `MSG91_SMS_SENDER_ID`, and `MSG91_WEBHOOK_SECRET` when ready to enable SMS/WhatsApp channels.
- **Native Vendor BGV / e-Sign Adapters:** Configure `AUTHBRIDGE_*`, `ONGRID_*`, `IDFY_*`, `DIGIO_*`, or `LEGALITY_*` keys when onboarding commercial accounts; in production without credentials, endpoints fail closed cleanly instead of silently simulating verifications.
