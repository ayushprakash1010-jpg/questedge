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

    const params = new URLSearchParams(req.nextUrl.searchParams.toString());

    const res = await fetch(`${getApiUrl()}/api/v1/admin/audit-log?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...getDemoRoleHeader(req) },
      cache: "no-store",
    });
    return forwardUpstreamResponse(res, "Failed to load audit log");
  } catch {
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
