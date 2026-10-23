import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  domain:
    process.env.AUTH0_DOMAIN ||
    process.env.AUTHO_DOMAIN ||
    (process.env.AUTH0_ISSUER_BASE_URL || process.env.AUTHO_ISSUER_BASE_URL)?.replace("https://", "").replace(/\/$/, "") ||
    "",
  clientId: process.env.AUTH0_CLIENT_ID || process.env.AUTHO_CLIENT_ID || "",
  clientSecret: process.env.AUTH0_CLIENT_SECRET || process.env.AUTHO_CLIENT_SECRET || "",
  secret: process.env.AUTH0_SECRET || process.env.AUTHO_SECRET || "",
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE || process.env.AUTHO_AUDIENCE,
    connection: process.env.AUTH0_CONNECTION || process.env.AUTHO_CONNECTION,
    scope: process.env.AUTH0_SCOPE || process.env.AUTHO_SCOPE || "openid profile email",
  },
  appBaseUrl: (
    process.env.APP_BASE_URL ||
    process.env.AUTH0_BASE_URL ||
    process.env.AUTHO_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://questedge-support-admin.vercel.app")
  ).trim(),
  routes: {
    callback: "/auth/callback",
    login: "/auth/login",
    logout: "/auth/logout",
  },
});
