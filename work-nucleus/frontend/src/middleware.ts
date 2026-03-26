import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
