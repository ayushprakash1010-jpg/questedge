import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleMockRequest, isMockMode } from "./lib/mock/router";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Mock mode: intercept API routes and bypass auth ────────
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

    // Skip Auth0 in mock mode
    if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Redirect login page to dashboard in mock mode
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  // ── Normal mode ─────────────────────────────────────────────
  const { auth0 } = await import("./lib/auth0");

  // Skip Auth0 middleware for non-auth API routes
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Let Auth0 handle auth routes
  const authResponse = await auth0.middleware(request);

  if (pathname.startsWith("/auth")) {
    return authResponse;
  }

  // Allow login page without auth
  if (pathname === "/login") {
    return authResponse;
  }

  // Protect all other pages — require session
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
