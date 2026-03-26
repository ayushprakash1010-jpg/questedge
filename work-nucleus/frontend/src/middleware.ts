import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleMockRequest, isMockMode } from "./lib/mock/router";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Mock mode: intercept API routes and bypass auth ────────
  if (isMockMode()) {
    // Intercept /api/* with mock data
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

    // Skip Auth0 for all other routes — allow pages to render freely
    if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Redirect landing page to dashboard in mock mode
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ── Normal mode: original Auth0 middleware ─────────────────
  const { auth0 } = await import("./lib/auth0");

  // Skip Auth0 middleware for non-auth API routes — they handle auth themselves
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Let Auth0 handle auth routes (/auth/login, /auth/callback, /auth/logout)
  const authResponse = await auth0.middleware(request);

  // For auth routes, return the Auth0 response directly
  if (pathname.startsWith("/auth")) {
    return authResponse;
  }

  // For the landing page, redirect authenticated users to dashboard
  if (pathname === "/") {
    const session = await auth0.getSession();
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
