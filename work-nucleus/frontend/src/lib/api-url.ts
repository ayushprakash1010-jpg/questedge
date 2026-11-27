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

const COMPANY_REFERER_PREFIXES = [
  "/dashboard",
  "/mandates",
  "/candidates",
  "/assessments",
  "/resume-ranker",
  "/appraisal",
  "/bgv",
  "/compensation",
  "/company",
  "/admin",
  "/offers",
  "/hiring-plans",
  "/training",
];

function inferDemoRoleFromReferer(referer: string): string | undefined {
  if (!referer) return undefined;
  if (referer.includes("/recruiter")) return "RECRUITER";
  if (referer.includes("/candidate/") || referer.endsWith("/candidate")) {
    return "CANDIDATE";
  }
  if (COMPANY_REFERER_PREFIXES.some((prefix) => referer.includes(prefix))) {
    return "COMPANY";
  }
  return undefined;
}

/**
 * Extracts X-Demo-Role header from an incoming NextRequest (header, demo_role cookie,
 * or optionally portal-exclusive Referer path) so server-to-server proxies preserve
 * Demo persona context consistently.
 */
export function getDemoRoleHeader(
  req?: NextRequest,
  options: { inferReferer?: boolean } = { inferReferer: true },
): Record<string, string> {
  if (!req) return {};
  const explicit =
    req.headers.get("x-demo-role") || req.cookies.get("demo_role")?.value;
  const demoRole =
    explicit ||
    (options.inferReferer !== false
      ? inferDemoRoleFromReferer(req.headers.get("referer") || "")
      : undefined);
  return demoRole ? { "X-Demo-Role": demoRole } : {};
}

export function getProxyHeaders(
  req: NextRequest | undefined,
  accessToken: string,
  contentType?: string,
): Record<string, string> {
  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    Authorization: `Bearer ${accessToken}`,
    ...getDemoRoleHeader(req),
  };
}
