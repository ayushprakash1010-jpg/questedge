# Work Nucleus — Auth0 Configuration Guide

> Step-by-step guide to configure Auth0 for the Work Nucleus application. This covers the frontend (Next.js + Auth0 SDK v4), backend (NestJS + JWT validation), and Management API integration.

---

## Architecture Overview

```
Browser → Auth0 Universal Login → Frontend (Next.js)
                                      ↓
                               Auth0 SDK v4 (session + access token)
                                      ↓
                               Backend (NestJS) validates JWT via JWKS
                                      ↓
                               Auth0 Management API (create/block users)
```

- **Auth0 owns**: Login, registration, sessions, refresh tokens, MFA, password reset
- **Backend owns**: JWT validation, user provisioning to local DB, RBAC via roles
- **Frontend owns**: Session management via Auth0 SDK, token-attached API calls via server-side proxy routes

---

## Step 1: Create a Regular Web Application (Frontend)

1. Go to **Applications → Applications → Create Application**
2. Name: `Work Nucleus Frontend`
3. Type: **Regular Web Applications**
4. Click **Create**
5. Go to the **Settings** tab and note down:
   - **Domain** → `AUTH0_DOMAIN` (e.g. `your-tenant.us.auth0.com`)
   - **Client ID** → `AUTH0_CLIENT_ID`
   - **Client Secret** → `AUTH0_CLIENT_SECRET`

6. Configure these URLs in the Settings tab:

   | Field                     | Value                              |
   | ------------------------- | ---------------------------------- |
   | **Allowed Callback URLs** | `http://localhost:3001/auth/callback` |
   | **Allowed Logout URLs**   | `http://localhost:3001`            |
   | **Allowed Web Origins**   | `http://localhost:3001`            |

7. Scroll to bottom and click **Save Changes**

> **Production note**: Add your production domain to each URL field (comma-separated) when deploying.

---

## Step 2: Create an API (Backend JWT Validation)

1. Go to **Applications → APIs → Create API**
2. Fill in:
   - **Name**: `Work Nucleus API`
   - **Identifier**: `https://api.work-nucleus.com`
   - **Signing Algorithm**: `RS256`
3. Click **Create**

This identifier is your `AUTH0_AUDIENCE`. It does not need to be a real URL — it's a logical identifier that must match across frontend and backend configuration.

### How it works

- The frontend requests an access token with this audience via `authorizationParameters.audience`
- The backend validates incoming JWTs against this audience using `passport-jwt` + `jwks-rsa`
- The JWKS endpoint (`https://<domain>/.well-known/jwks.json`) is used to verify RS256 signatures

---

## Step 3: Create a Machine-to-Machine Application (Management API)

The backend needs this to create users, send password reset emails, and block/unblock users via Auth0's Management API.

1. Go to **Applications → Applications → Create Application**
2. Name: `Work Nucleus Backend (M2M)`
3. Type: **Machine to Machine Applications**
4. Click **Create**
5. When prompted to authorize an API, select **Auth0 Management API**
6. Grant these **permissions/scopes**:
   - `read:users`
   - `create:users`
   - `update:users`
   - `create:user_tickets` (for password reset emails)
7. Click **Authorize**
8. Go to the **Settings** tab and note down:
   - **Client ID** → `AUTH0_MANAGEMENT_CLIENT_ID`
   - **Client Secret** → `AUTH0_MANAGEMENT_CLIENT_SECRET`

### What the backend uses this for

| Operation               | Management API Method          | When                              |
| ----------------------- | ------------------------------ | --------------------------------- |
| Create user (admin)     | `management.users.create()`    | Admin invites a new team member   |
| Send password reset     | `management.tickets.changePassword()` | After creating a user      |
| Block user (soft delete)| `management.users.update({ blocked: true })` | Admin deactivates a user |
| Unblock user            | `management.users.update({ blocked: false })` | Admin reactivates a user |

---

## Step 4: Enable Database Connection

1. Go to **Authentication → Database → Username-Password-Authentication**
   - This connection exists by default in new tenants
2. Ensure it is **enabled** for both applications:
   - Click on the connection → go to **Applications** tab
   - Toggle **ON** for `Work Nucleus Frontend`
   - Toggle **ON** for `Work Nucleus Backend (M2M)`

> This connection name (`Username-Password-Authentication`) is referenced in the backend code at `auth0-management.service.ts` when creating users.

---

## Step 5: Configure Social Connections (Optional)

If you want Google, GitHub, or other social logins:

1. Go to **Authentication → Social**
2. Enable desired providers (e.g. **Google**, **GitHub**)
3. Configure each with their respective OAuth client credentials
4. Go to each provider's **Applications** tab and enable for `Work Nucleus Frontend`

Social login users will still go through the same provisioning flow — Auth0 provides the `sub` claim, and the backend maps it to a local user.

---

## Step 6: Generate AUTH0_SECRET

The `AUTH0_SECRET` is used by the Auth0 Next.js SDK to encrypt session cookies. Generate it:

```bash
openssl rand -hex 32
```

This value goes into `AUTH0_SECRET` in the frontend `.env.local`. It must be at least 32 characters.

---

## Step 7: Fill in Environment Files

### Frontend — `/work-nucleus/frontend/.env.local`

```env
# Auth0 (v4 SDK)
AUTH0_SECRET=<output from openssl rand -hex 32>
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=<Client ID from Step 1>
AUTH0_CLIENT_SECRET=<Client Secret from Step 1>
AUTH0_AUDIENCE=https://api.work-nucleus.com
APP_BASE_URL=http://localhost:3001

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend — `/work-nucleus/backend/.env`

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/work_nucleus?schema=public

# Auth0
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.work-nucleus.com
AUTH0_MANAGEMENT_CLIENT_ID=<Client ID from Step 3>
AUTH0_MANAGEMENT_CLIENT_SECRET=<Client Secret from Step 3>
AUTH0_SYNC_SECRET=<random string: openssl rand -hex 16>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3000
NODE_ENV=development
```

### Key rules

- `AUTH0_DOMAIN` must be identical in both files
- `AUTH0_AUDIENCE` must be identical in both files and match the API Identifier from Step 2
- Frontend uses the **Regular Web App** credentials (Step 1)
- Backend uses the **M2M App** credentials (Step 3)
- Never commit `.env.local` or `.env` to git (they are in `.gitignore`)

---

## Step 8: Verify the Setup

1. Start infrastructure:
   ```bash
   make infra          # PostgreSQL + Redis via Docker
   make prisma-migrate # Run database migrations
   ```

2. Start the application:
   ```bash
   make dev            # Backend + Frontend
   ```

3. Visit `http://localhost:3001` — landing page should render

4. Click **Start Free Trial** or **Log in** → redirects to Auth0 Universal Login

5. Sign up with email/password → Auth0 redirects back to the app

6. You land on the **onboarding page** (`/onboarding`) because the user isn't provisioned in the local database yet

7. Fill in organization name and your name → submits to `/auth/provision` → creates org + user in PostgreSQL

8. Redirected to `/dashboard` — you're now fully authenticated and provisioned

---

## Auth Flow Diagram

```
1. User clicks "Login" on landing page
       ↓
2. Redirect to Auth0 Universal Login (hosted by Auth0)
       ↓
3. User signs up / logs in (email+password or social)
       ↓
4. Auth0 redirects to /auth/callback with authorization code
       ↓
5. Auth0 SDK exchanges code for tokens, creates encrypted session cookie
       ↓
6. Frontend calls GET /api/profile (server-side proxy route)
       ↓
7. Proxy route extracts access token from session → calls backend GET /auth/me
       ↓
8. Backend validates JWT via JWKS, looks up user by auth0Sub
       ↓
9a. User found → return profile → redirect to /dashboard
9b. User NOT found → return { isProvisioned: false } → redirect to /onboarding
       ↓
10. Onboarding form → POST /auth/provision → creates Organization + User
       ↓
11. User is now fully provisioned → redirect to /dashboard
```

---

## Configuration Checklist

- [ ] Regular Web App created (`Work Nucleus Frontend`)
- [ ] Callback URL set to `http://localhost:3001/auth/callback`
- [ ] Logout URL set to `http://localhost:3001`
- [ ] Web Origins set to `http://localhost:3001`
- [ ] API created with identifier `https://api.work-nucleus.com` and RS256
- [ ] M2M App created (`Work Nucleus Backend (M2M)`)
- [ ] M2M App authorized for Auth0 Management API with scopes: `read:users`, `create:users`, `update:users`, `create:user_tickets`
- [ ] `Username-Password-Authentication` connection enabled for both apps
- [ ] `AUTH0_SECRET` generated via `openssl rand -hex 32`
- [ ] Frontend `.env.local` filled with Regular Web App credentials
- [ ] Backend `.env` filled with M2M App credentials
- [ ] `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` match across both env files
- [ ] Social connections configured (optional)

---

## Troubleshooting

| Issue | Cause | Fix |
| ----- | ----- | --- |
| "Callback URL mismatch" on login | Allowed Callback URLs not set | Add `http://localhost:3001/auth/callback` in App Settings |
| 401 on backend API calls | `AUTH0_AUDIENCE` mismatch | Ensure identical value in frontend `.env.local` and backend `.env` |
| "Unable to verify token" | Wrong domain or algorithm | Confirm `AUTH0_DOMAIN` matches tenant and API uses RS256 |
| Management API 403 | Missing scopes on M2M app | Re-authorize M2M app with required permissions in Step 3 |
| "Unauthorized" after login | User not provisioned | This is expected — user needs to complete onboarding at `/onboarding` |
| Session cookie not persisting | `AUTH0_SECRET` missing or too short | Generate with `openssl rand -hex 32` (min 32 chars) |
