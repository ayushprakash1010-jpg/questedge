import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleMockRequest, isMockMode } from "./lib/mock/router";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/company",
  "/recruiter",
  "/candidate",
  "/candidates",
  "/hiring-plans",
  "/mandates",
  "/offers",
  "/bgv",
  "/appraisal",
  "/compensation",
  "/admin",
  "/profile",
  "/support",
  "/training",
  "/onboarding",
  "/notifications",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Mock mode (Development only): intercept API routes and bypass auth ────────
  if (isMockMode()) {
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      let body: unknown = undefined;
      if (request.method !== "GET" && request.method !== "HEAD") {
        try {
          body = await request.json();
        } catch {
          body = undefined;
        }
      }
      const mockResponse = handleMockRequest(
        request.method,
        pathname,
        request.nextUrl.searchParams,
        body,
      );
      if (mockResponse) return mockResponse;
    }

    // Skip Auth0 for all other routes in mock mode — allow pages to render freely
    if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ── Normal mode: Auth0 middleware ───────────────────────────
  const { auth0 } = await import("./lib/auth0");

  // Skip Auth0 middleware for non-auth API routes — they handle auth themselves
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Let Auth0 handle auth routes (/auth/login, /auth/callback, /auth/logout)
  const authResponse = await auth0.middleware(request);

  if (pathname.startsWith("/auth")) {
    return authResponse;
  }

  // ── Server-side protected route guard (P3-01) ─────────────────
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected) {
    const session = await auth0.getSession(request);
    if (!session || !session.user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
