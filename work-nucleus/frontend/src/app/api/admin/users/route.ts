import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getDemoRoleHeader,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const { searchParams } = new URL(req.url);
    const params = new URLSearchParams();
    for (const key of ["page", "limit", "search", "role", "isActive"]) {
      const val = searchParams.get(key);
      if (val !== null && val !== "") params.set(key, val);
    }
    if (!params.has("page")) params.set("page", "1");

    const res = await fetch(
      `${getApiUrl()}/api/v1/admin/users?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, ...getDemoRoleHeader(req) },
        cache: "no-store",
      },
    );

    return forwardUpstreamResponse(res, "Failed to fetch users");
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(`${getApiUrl()}/api/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...getDemoRoleHeader(req),
      },
      body: JSON.stringify(body),
    });

    return forwardUpstreamResponse(res, "Failed to create user");
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
