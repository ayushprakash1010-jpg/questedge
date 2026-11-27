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
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(`${getApiUrl()}/api/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...getDemoRoleHeader(req) },
      cache: "no-store",
    });
    return forwardUpstreamResponse(res, "Failed to fetch settings");
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(`${getApiUrl()}/api/v1/admin/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...getDemoRoleHeader(req),
      },
      body: JSON.stringify(body),
    });
    return forwardUpstreamResponse(res, "Failed to update settings");
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
