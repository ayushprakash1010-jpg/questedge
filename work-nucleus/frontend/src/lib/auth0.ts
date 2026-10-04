import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
  },
  appBaseUrl: (process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined))?.trim(),
  routes: {
    callback: "/auth/callback",
    login: "/auth/login",
    logout: "/auth/logout",
  },
});
