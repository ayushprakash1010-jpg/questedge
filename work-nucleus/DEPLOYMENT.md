# QuestEdge Deployment Runbook

This guide provides step-by-step instructions to deploy the QuestEdge stack (Next.js + NestJS + PostgreSQL + Redis) using free-tier services. We will use Vercel for the frontend, Render for the backend, Neon for PostgreSQL, and Upstash for Redis.

## Prerequisites
- Your code must be pushed to a **GitHub repository**.
- You need a configured **Auth0 tenant** with a Single Page Application (SPA) and an API defined.

---

## Step 1: Database (Neon.tech)
We use Neon to host our serverless PostgreSQL database.

1. Go to [neon.tech](https://neon.tech/) and sign up.
2. Click **Create Project**. Name it `questedge-db` and select the region closest to you.
3. Once created, copy the **Postgres connection string** (e.g., `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`).
4. Save this connection string—we will need it for the Backend deployment.

---

## Step 2: Redis (Upstash)
The NestJS backend requires Redis for caching or queues. We will use Upstash's free Serverless Redis.

1. Go to [upstash.com](https://upstash.com/) and sign up.
2. Click **Create Database** under the Redis section. Name it `questedge-redis`.
3. Scroll down to the **Connect to your database** section. Find the **Endpoint** (Host) and **Port**. Also note the **Password** if applicable.
4. Save the Host and Port—we will need them for the Backend deployment.

---

## Step 3: Backend API (Render)
We use Render to host the NestJS API.

1. Go to [render.com](https://render.com/) and sign up.
2. Click **New** -> **Web Service**.
3. Connect your GitHub account and select your `questedge` repository.
4. Configure the service:
   - **Name**: `questedge-api` (or similar)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:prod`
5. Scroll down to **Environment Variables** and add the following:
   - `DATABASE_URL`: *The Neon Postgres URL from Step 1*
   - `AUTH0_DOMAIN`: *Your Auth0 tenant domain (e.g., your-tenant.auth0.com)*
   - `AUTH0_AUDIENCE`: *Your Auth0 API audience identifier*
   - `AUTH0_MANAGEMENT_CLIENT_ID`: *Auth0 Machine-to-Machine App Client ID*
   - `AUTH0_MANAGEMENT_CLIENT_SECRET`: *Auth0 Machine-to-Machine App Client Secret*
   - `AUTH0_SYNC_SECRET`: *Your Auth0 webhook sync secret*
   - `REDIS_HOST`: *Your Upstash Redis Host*
   - `REDIS_PORT`: *Your Upstash Redis Port*
   - `REDIS_PASSWORD`: *(If provided by Upstash, otherwise omit or update your backend code to support it)*
   - `PORT`: `3000`
   - `NODE_ENV`: `production`
6. Click **Create Web Service**. Wait for the build to finish.
7. Once live, copy your **Render URL** (e.g., `https://questedge-api.onrender.com`).

---

## Step 4: Frontend (Vercel)
We use Vercel to host the Next.js frontend.

1. Go to [vercel.com](https://vercel.com/) and sign up.
2. Click **Add New Project**.
3. Import your `questedge` GitHub repository.
4. Configure the project:
   - **Root Directory**: Select the `frontend` folder.
   - **Framework Preset**: Vercel should automatically detect `Next.js`.
5. Expand the **Environment Variables** section and add:
   - `AUTH0_SECRET`: *Generate a random 32-character string (e.g., use `openssl rand -hex 32`)*
   - `AUTH0_DOMAIN`: *Your Auth0 tenant domain*
   - `AUTH0_CLIENT_ID`: *Your Auth0 SPA Application Client ID*
   - `AUTH0_CLIENT_SECRET`: *Your Auth0 SPA Application Client Secret*
   - `AUTH0_AUDIENCE`: *Your Auth0 API audience identifier*
   - `APP_BASE_URL`: *For now, you can leave this blank or guess your vercel domain. We will update it in Step 6.*
   - `NEXT_PUBLIC_API_URL`: *The Render URL from Step 3 (e.g., `https://questedge-api.onrender.com`)*
6. Click **Deploy**.
7. Once finished, Vercel will give you a public URL for your frontend (e.g., `https://questedge-frontend.vercel.app`).

---

## Step 5: Database Setup & Migrations
Now that the database is live, we need to initialize its schema.

1. On your local machine, open the `backend/.env` file.
2. Temporarily replace the local `DATABASE_URL` with your **Neon Postgres connection string**.
3. Open your terminal, navigate to the backend folder:
   ```bash
   cd backend
   ```
4. Run the Prisma database push/migration command to create your tables:
   ```bash
   npx prisma db push
   ```
5. *(Optional)* If you have seed data, run the seed script:
   ```bash
   npx prisma db seed
   ```
6. **Important:** Change your local `backend/.env` file back to the local database connection string so you don't accidentally develop against production!

---

## Step 6: Finalize Auth0 & Vercel Configuration
Auth0 needs to know your live Vercel URL to allow logins, and Vercel needs to know its own URL for Auth0 callbacks.

1. **Update Vercel Environment Variables:**
   - Go to your Vercel Project Dashboard -> **Settings** -> **Environment Variables**.
   - Update `APP_BASE_URL` to be your live Vercel frontend URL (e.g., `https://questedge-frontend.vercel.app`).
   - Go to **Deployments** and click **Redeploy** on the latest deployment so the new variables take effect.

2. **Update Auth0 Application URLs:**
   - Go to your Auth0 Dashboard -> **Applications** -> Select your SPA Application.
   - Update **Allowed Callback URLs**: `https://questedge-frontend.vercel.app/api/auth/callback`
   - Update **Allowed Logout URLs**: `https://questedge-frontend.vercel.app`
   - Update **Allowed Web Origins**: `https://questedge-frontend.vercel.app`
   - Save the changes.

---

## Success! 🎉
Your application is now fully deployed:
- **Frontend:** Live on Vercel
- **Backend API:** Live on Render
- **Database:** Hosted on Neon
- **Cache:** Hosted on Upstash

You can now visit your Vercel URL and interact with the application!
