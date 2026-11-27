import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getProxyHeaders,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const type = req.nextUrl.searchParams.get("type");
    let endpoint = `${getApiUrl()}/api/v1/notifications`;

    if (type === "unread-count") {
      endpoint += "/unread-count";
    } else {
      const params = new URLSearchParams();
      const page = req.nextUrl.searchParams.get("page");
      const limit = req.nextUrl.searchParams.get("limit");
      const unreadOnly = req.nextUrl.searchParams.get("unreadOnly");
      const category = req.nextUrl.searchParams.get("category") || type;

      if (page) params.set("page", page);
      if (limit) params.set("limit", limit);
      if (unreadOnly) params.set("unreadOnly", unreadOnly);
      if (category && category !== "unread-count") params.set("type", category);
      if (params.toString()) endpoint += `?${params}`;
    }

    const res = await fetch(endpoint, {
      headers: getProxyHeaders(req, accessToken),
      cache: "no-store",
    });
    return forwardUpstreamResponse(res, "Failed to load notifications");
  } catch {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const action = req.nextUrl.searchParams.get("action");
    let endpoint = `${getApiUrl()}/api/v1/notifications`;
    let body: string | undefined;

    if (action === "mark-all-read") {
      endpoint += "/mark-all-read";
    } else if (action === "mark-read") {
      endpoint += "/mark-read";
      body = JSON.stringify(await req.json());
    } else {
      return NextResponse.json({ error: "Invalid notifications action" }, { status: 400 });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken, body ? "application/json" : undefined),
      ...(body ? { body } : {}),
    });
    return forwardUpstreamResponse(res, "Failed to update notifications");
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
