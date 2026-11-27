import type { NextRequest } from "next/server";

/**
 * Returns the backend API base URL for server-side usage.
 * In Docker, API_URL_INTERNAL points to the backend service name (e.g. http://backend:3000).
 * Locally, falls back to NEXT_PUBLIC_API_URL or localhost.
 */
export function getApiUrl(): string {
  return (
    process.env.API_URL_INTERNAL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://questedge.onrender.com"
      : "http://localhost:3000")
  );
}

/**
 * Extracts X-Demo-Role header from an incoming NextRequest (header or demo_role cookie)
 * so server-to-server proxies preserve Demo persona context consistently.
 */
export function getDemoRoleHeader(req?: NextRequest): Record<string, string> {
  if (!req) return {};
  const demoRole =
    req.headers.get("x-demo-role") || req.cookies.get("demo_role")?.value;
  return demoRole ? { "X-Demo-Role": demoRole } : {};
}
