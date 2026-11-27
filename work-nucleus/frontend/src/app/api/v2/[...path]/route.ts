import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getDemoRoleHeader,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await ctx.params;
    if (
      !Array.isArray(path) ||
      path.length === 0 ||
      path.some((seg) => !seg || seg === "." || seg === ".." || seg.includes("/") || seg.includes("\\") || seg.includes("%"))
    ) {
      return NextResponse.json({ error: "Invalid API path" }, { status: 400 });
    }

    const encodedPath = path.map((seg) => encodeURIComponent(seg)).join("/");
    const target = `${getApiUrl()}/api/v2/${encodedPath}`;
    const search = req.nextUrl.search;
    const url = `${target}${search || ""}`;

    const isPublic = path[0] === "public" || path[0] === "webhooks" || path[0] === "assessment-take";
    const headers: Record<string, string> = {};
    const ct = req.headers.get("content-type");
    if (ct) headers["content-type"] = ct;

    if (!isPublic) {
      const session = await auth0.getSession();
      if (!session) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      try {
        const { token } = await auth0.getAccessToken();
        headers.authorization = `Bearer ${token}`;
      } catch {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      Object.assign(headers, getDemoRoleHeader(req));
    }

    const init: RequestInit = { method: req.method, headers, cache: "no-store" };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.arrayBuffer();
    }

    const upstream = await fetch(url, init);
    return forwardUpstreamResponse(upstream, "Backend service unavailable");
  } catch {
    return NextResponse.json(
      { error: "Failed to proxy v2 request" },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
