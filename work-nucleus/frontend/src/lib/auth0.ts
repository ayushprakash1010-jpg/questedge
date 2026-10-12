import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
  },
  // APP_BASE_URL must always resolve to the stable production domain.
  // VERCEL_PROJECT_PRODUCTION_URL is Vercel's built-in stable domain env var.
  // VERCEL_URL changes per-deployment and must NEVER be used here — it breaks state cookies.
  // Final fallback is hardcoded to 'https://questedge.vercel.app' to prevent 'state parameter is invalid' errors.
  appBaseUrl: (
    process.env.APP_BASE_URL ||
    process.env.AUTH0_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://questedge.vercel.app')
  ).trim(),
  routes: {
    callback: "/auth/callback",
    login: "/auth/login",
    logout: "/auth/logout",
  },
});
